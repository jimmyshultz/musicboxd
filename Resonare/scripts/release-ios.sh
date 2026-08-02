#!/usr/bin/env bash
#
# release-ios.sh — archive, export, and (optionally) upload Resonare to App Store Connect.
#
# This is the CLI equivalent of Xcode Organizer's "Archive" + "Distribute App".
#
#   ./scripts/release-ios.sh                 # preflight + archive + export IPA
#   ./scripts/release-ios.sh --build 3       # ...after setting build number to 3
#   ./scripts/release-ios.sh --upload        # ...and upload to App Store Connect
#   ./scripts/release-ios.sh --preflight     # run the checks only, build nothing
#
# Uploading is opt-in on purpose: archiving should never be an accidental publish.
#
# ── Prerequisites (both are one-time, and both are yours to set up) ────────────
#
# 1. Apple Distribution identity in the login keychain. Xcode ▸ Settings ▸
#    Accounts ▸ <team> ▸ Manage Certificates ▸ + ▸ Apple Distribution.
#    An "Apple Development" cert is NOT sufficient for App Store distribution.
#
# 2. For --upload only: an App Store Connect API key.
#    App Store Connect ▸ Users and Access ▸ Integrations ▸ App Store Connect API.
#    Create a key with the "App Manager" role, download the .p8, and save it as
#      ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8
#    then export these in your shell (add to ~/.zshrc to persist):
#      export ASC_KEY_ID=<the key id>
#      export ASC_ISSUER_ID=<the issuer id shown above the key list>
#    altool reads the .p8 from that directory by key id; the secret never
#    appears on a command line or in this script.
#
# ── A note on .env ────────────────────────────────────────────────────────────
#
# The Xcode Release build phase copies .env.production over .env, which leaves
# your working tree pointed at the PRODUCTION Supabase project after a build.
# This script snapshots .env up front and restores it on exit, including on
# failure or Ctrl-C, so a plain `npm run ios` afterward still hits dev.

set -euo pipefail

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$APP_DIR/ios"
BUILD_DIR="$APP_DIR/build/release"
WORKSPACE="$IOS_DIR/Resonare.xcworkspace"
SCHEME="Resonare"
PBXPROJ="$IOS_DIR/Resonare.xcodeproj/project.pbxproj"
EXPORT_OPTIONS="$IOS_DIR/ExportOptions.plist"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_PATH="$BUILD_DIR/Resonare-$TIMESTAMP.xcarchive"
EXPORT_PATH="$BUILD_DIR/export-$TIMESTAMP"
LOG_FILE="$BUILD_DIR/build-$TIMESTAMP.log"

DIST_CERT_NAME="Apple Distribution"

# ── Args ──────────────────────────────────────────────────────────────────────
DO_UPLOAD=false
PREFLIGHT_ONLY=false
NEW_BUILD_NUMBER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --upload)    DO_UPLOAD=true; shift ;;
    --preflight) PREFLIGHT_ONLY=true; shift ;;
    --build)     NEW_BUILD_NUMBER="${2:-}"; shift 2 ;;
    -h|--help)   sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)           echo "unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
done

# ── Output helpers ────────────────────────────────────────────────────────────
step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── Restore .env no matter how we exit ────────────────────────────────────────
ENV_FILE="$APP_DIR/.env"
ENV_BACKUP=""
restore_env() {
  if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
    cp "$ENV_BACKUP" "$ENV_FILE"
    rm -f "$ENV_BACKUP"
    printf '  \033[32m✓\033[0m restored .env (%s)\n' \
      "$(grep -E '^ENVIRONMENT=' "$ENV_FILE" | cut -d= -f2 || echo unknown)"
  fi
}
trap restore_env EXIT INT TERM

# ── Preflight ─────────────────────────────────────────────────────────────────
step "Preflight"

# Node must match .nvmrc, and Xcode's build phases shell out to the absolute
# path pinned in ios/.xcode.env.local — a stale path there breaks Metro/codegen
# inside the build with a confusing error.
if [[ -f "$IOS_DIR/.xcode.env.local" ]]; then
  XCODE_NODE="$(sed -n 's/^export NODE_BINARY=//p' "$IOS_DIR/.xcode.env.local" | head -1)"
  if [[ -n "$XCODE_NODE" && ! -x "$XCODE_NODE" ]]; then
    die "ios/.xcode.env.local points at a node that no longer exists:
    $XCODE_NODE
  Repoint it (do not delete it — Xcode's build shell does not load nvm):
    echo \"export NODE_BINARY=\$(command -v node)\" > ios/.xcode.env.local"
  fi
  ok "Xcode node: $("$XCODE_NODE" -v) ($XCODE_NODE)"
  export PATH="$(dirname "$XCODE_NODE"):$PATH"
fi

command -v xcodebuild >/dev/null || die "xcodebuild not found. Is Xcode installed and selected?"
ok "Xcode: $(xcodebuild -version | head -1)"

[[ -f "$APP_DIR/.env.production" ]] || die ".env.production is missing — the Release build phase needs it."
ok ".env.production present"

[[ -f "$EXPORT_OPTIONS" ]] || die "missing $EXPORT_OPTIONS"
ok "ExportOptions.plist present"

# The distribution identity is the usual failure, and it fails ~15 minutes into
# the archive if we do not check first.
if security find-identity -v -p codesigning 2>/dev/null | grep -q "$DIST_CERT_NAME"; then
  ok "signing identity: $(security find-identity -v -p codesigning | grep "$DIST_CERT_NAME" | head -1 | sed -E 's/.*"(.*)"/\1/')"
else
  die "No \"$DIST_CERT_NAME\" identity in the keychain.

  Found instead:
$(security find-identity -v -p codesigning 2>/dev/null | grep -E '^\s+[0-9]\)' | sed 's/^/    /' || echo '    (none)')

  An Apple Development certificate cannot sign an App Store build. Add one via
  Xcode ▸ Settings ▸ Accounts ▸ <team> ▸ Manage Certificates ▸ + ▸ Apple Distribution,
  or import a .p12 backup of the existing distribution cert."
fi

if $DO_UPLOAD; then
  [[ -n "${ASC_KEY_ID:-}"    ]] || die "--upload needs ASC_KEY_ID (see the header of this script)."
  [[ -n "${ASC_ISSUER_ID:-}" ]] || die "--upload needs ASC_ISSUER_ID (see the header of this script)."
  KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
  [[ -f "$KEY_PATH" ]] || die "App Store Connect API key not found at:
    $KEY_PATH
  Download it from App Store Connect ▸ Users and Access ▸ Integrations."
  ok "App Store Connect API key found (key id ${ASC_KEY_ID})"
fi

MARKETING_VERSION="$(grep -m1 'MARKETING_VERSION = ' "$PBXPROJ" | sed -E 's/.*= (.*);/\1/')"
CURRENT_BUILD="$(grep -m1 'CURRENT_PROJECT_VERSION = ' "$PBXPROJ" | sed -E 's/.*= (.*);/\1/')"
ok "version $MARKETING_VERSION (build $CURRENT_BUILD)"

if [[ -n "$(git -C "$APP_DIR" status --porcelain 2>/dev/null)" ]]; then
  warn "working tree is dirty — the archive will include uncommitted changes"
fi

if $PREFLIGHT_ONLY; then
  step "Preflight only — stopping here."
  exit 0
fi

# ── Build number ──────────────────────────────────────────────────────────────
# Every upload of a given version string needs a unique, increasing build number
# or App Store Connect rejects it.
if [[ -n "$NEW_BUILD_NUMBER" ]]; then
  step "Setting build number to $NEW_BUILD_NUMBER"
  [[ "$NEW_BUILD_NUMBER" =~ ^[0-9]+$ ]] || die "build number must be an integer, got: $NEW_BUILD_NUMBER"
  sed -i '' -E "s/CURRENT_PROJECT_VERSION = [0-9]+;/CURRENT_PROJECT_VERSION = $NEW_BUILD_NUMBER;/g" "$PBXPROJ"
  ok "$(grep -c "CURRENT_PROJECT_VERSION = $NEW_BUILD_NUMBER;" "$PBXPROJ") build configurations updated"
  warn "commit this pbxproj change so the tag matches what shipped"
  CURRENT_BUILD="$NEW_BUILD_NUMBER"
fi

# ── Snapshot .env ─────────────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  ENV_BACKUP="$(mktemp -t resonare-env)"
  cp "$ENV_FILE" "$ENV_BACKUP"
  ok "snapshotted .env for restore on exit"
fi

mkdir -p "$BUILD_DIR"

# ── Pods ──────────────────────────────────────────────────────────────────────
# Also re-applies the Podfile post_install workaround that restores the
# [RNFB] Crashlytics Configuration phase dropped by @react-native-firebase 26.
step "Installing pods"
( cd "$IOS_DIR" && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install ) >>"$LOG_FILE" 2>&1 \
  || die "pod install failed — see $LOG_FILE"
grep -q "RNFB\] Crashlytics Configuration" "$PBXPROJ" \
  || die "The [RNFB] Crashlytics Configuration build phase is missing after pod install.
  Without it, dSYMs never reach Firebase and production crashes arrive unsymbolicated.
  Check the post_install block in ios/Podfile."
ok "pods installed, Crashlytics dSYM phase intact"

# ── Archive ───────────────────────────────────────────────────────────────────
step "Archiving $MARKETING_VERSION ($CURRENT_BUILD) — this takes a while"
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  >>"$LOG_FILE" 2>&1 || die "archive failed. Last errors:
$(grep -E 'error:' "$LOG_FILE" | tail -20 || echo '  (no error: lines — see the full log)')

  Full log: $LOG_FILE"
ok "archived: $ARCHIVE_PATH"

# Release-only things that a Debug simulator build cannot tell you.
grep -q "Production environment activated" "$LOG_FILE" \
  || warn "the .env.production copy phase did not report success — verify the build points at prod Supabase"
grep -q "Exec FirebaseCrashlytics Run" "$LOG_FILE" \
  || warn "FirebaseCrashlytics run phase did not execute — dSYMs may not reach Firebase"
[[ -f "$ARCHIVE_PATH/Products/Applications/Resonare.app/main.jsbundle" ]] \
  || die "no main.jsbundle in the archive — the JS bundle step did not run"
ok "JS bundle, prod env, and Crashlytics phase all verified in the archive"

# ── Export ────────────────────────────────────────────────────────────────────
step "Exporting signed IPA"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -exportPath "$EXPORT_PATH" \
  -allowProvisioningUpdates \
  >>"$LOG_FILE" 2>&1 || die "export failed. Last errors:
$(grep -E 'error:' "$LOG_FILE" | tail -20 || echo '  (see the full log)')

  Full log: $LOG_FILE"

IPA="$(find "$EXPORT_PATH" -name '*.ipa' -maxdepth 1 | head -1)"
[[ -n "$IPA" ]] || die "export reported success but produced no .ipa — see $LOG_FILE"
ok "exported: $IPA ($(du -h "$IPA" | cut -f1))"

# ── Upload ────────────────────────────────────────────────────────────────────
if ! $DO_UPLOAD; then
  step "Done — not uploaded"
  cat <<EOF

  Archive: $ARCHIVE_PATH
  IPA:     $IPA
  Log:     $LOG_FILE

  To upload this build to App Store Connect, re-run with --upload, or open the
  archive in Xcode Organizer:
    open "$ARCHIVE_PATH"

EOF
  exit 0
fi

step "Validating with App Store Connect"
xcrun altool --validate-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" \
  2>&1 | tee -a "$LOG_FILE" | sed 's/^/  /' \
  || die "validation failed — fix the reported issues before uploading"
ok "validation passed"

step "Uploading to App Store Connect"
xcrun altool --upload-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" \
  2>&1 | tee -a "$LOG_FILE" | sed 's/^/  /' \
  || die "upload failed — see $LOG_FILE"

step "Uploaded: $MARKETING_VERSION ($CURRENT_BUILD)"
cat <<EOF

  Processing on Apple's side usually takes 5-30 minutes. Then:

  1. App Store Connect ▸ TestFlight — the build appears once processed.
  2. Internal testers can install immediately; no review needed.
  3. External testing needs Beta App Review (usually under 24h).

  Remember to increment the build number before the next upload:
    ./scripts/release-ios.sh --build $((CURRENT_BUILD + 1)) --upload

EOF
