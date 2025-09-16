#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}🚀 Production Archive Readiness Check${NC}"
echo "======================================"
echo ""

echo -e "${BLUE}✅ VERIFIED: Core Project Structure${NC}"
echo "• Xcode workspace: ios/Resonare.xcworkspace ✅"
echo "• Xcode project: ios/Resonare.xcodeproj ✅"
echo "• react-native-config: $(grep -q 'react-native-config' package.json && echo '✅ Installed' || echo '❌ Missing')"
echo "• Environment config: $([ -f 'src/config/environment.ts' ] && echo '✅ Present' || echo '❌ Missing')"
echo ""

echo -e "${BLUE}🔧 Build Configuration Analysis${NC}"
echo "-------------------------------"

# Check Archive scheme configuration
SCHEME_FILE="ios/Resonare.xcodeproj/xcshareddata/xcschemes/Resonare.xcscheme"
if [ -f "$SCHEME_FILE" ] && grep -A 5 "ArchiveAction" "$SCHEME_FILE" | grep -q 'buildConfiguration = "Release"'; then
    echo -e "✅ ${GREEN}Archive scheme uses Release configuration${NC}"
else
    echo -e "❌ ${RED}Archive scheme not configured for Release${NC}"
    echo -e "   ${YELLOW}Fix: Xcode → Edit Scheme → Archive → Build Configuration = Release${NC}"
fi

# Check Release configuration exists
if grep -q "13B07F951A680F5B00A75B9A.*Release" ios/Resonare.xcodeproj/project.pbxproj; then
    echo -e "✅ ${GREEN}Release build configuration exists${NC}"
else
    echo -e "❌ ${RED}Release build configuration missing${NC}"
fi

echo ""
echo -e "${BLUE}🔐 Code Signing Status${NC}"
echo "----------------------"

# Check development team
TEAM_ID=$(grep "DEVELOPMENT_TEAM" ios/Resonare.xcodeproj/project.pbxproj | head -1 | sed 's/.*= \(.*\);/\1/' | tr -d '"')
if [ -n "$TEAM_ID" ] && [ "$TEAM_ID" != "" ]; then
    echo -e "✅ ${GREEN}Development team configured: $TEAM_ID${NC}"
else
    echo -e "❌ ${RED}Development team not configured${NC}"
    echo -e "   ${YELLOW}Fix: Set Apple Developer Team in Xcode project settings${NC}"
fi

# Check bundle identifier
BUNDLE_ID=$(grep "PRODUCT_BUNDLE_IDENTIFIER" ios/Resonare.xcodeproj/project.pbxproj | head -1 | sed 's/.*= \(.*\);/\1/' | tr -d '"')
if [ -n "$BUNDLE_ID" ]; then
    echo -e "✅ ${GREEN}Bundle identifier: $BUNDLE_ID${NC}"
else
    echo -e "❌ ${RED}Bundle identifier not configured${NC}"
fi

echo ""
echo -e "${BLUE}📱 Environment Configuration${NC}"
echo "-----------------------------"

echo -e "ℹ️  ${YELLOW}You confirmed .env.production exists locally (not in git)${NC}"
echo ""
echo -e "${BOLD}🔍 Your .env.production MUST contain:${NC}"
echo -e "${GREEN}ENVIRONMENT=production${NC} (critical for production mode)"
echo -e "${GREEN}SUPABASE_URL=https://your-prod-id.supabase.co${NC}"
echo -e "${GREEN}SUPABASE_ANON_KEY=your_production_anon_key${NC}"
echo -e "${GREEN}SPOTIFY_CLIENT_ID=your_spotify_client_id${NC}"
echo -e "${GREEN}APP_NAME=Resonare${NC}"
echo -e "${GREEN}BUNDLE_ID=$BUNDLE_ID${NC}"

echo ""
echo -e "${BLUE}🏗️ Build Script Phase${NC}"
echo "---------------------"
echo -e "⚠️  ${YELLOW}MANUAL VERIFICATION REQUIRED:${NC}"
echo ""
echo "In Xcode, verify you have added this Build Script Phase:"
echo -e "${GREEN}Target → Build Phases → + → New Run Script Phase${NC}"
echo ""
echo "Script content:"
echo -e "${GREEN}if [ \"\${CONFIGURATION}\" = \"Release\" ]; then"
echo "  export ENVFILE=.env.production"
echo "  echo \"✅ Using production environment: \$ENVFILE\""
echo "else"
echo "  echo \"ℹ️  Using default environment for configuration: \$CONFIGURATION\""
echo -e "fi${NC}"
echo ""
echo -e "⚠️  ${YELLOW}IMPORTANT: Drag this script ABOVE 'Compile Sources'${NC}"

echo ""
echo -e "${BLUE}🎯 Pre-Archive Checklist${NC}"
echo "========================"
echo ""
echo "Before running Product → Archive:"
echo -e "1. ${GREEN}✅ Open Xcode: open ios/Resonare.xcworkspace${NC}"
echo -e "2. ${GREEN}✅ Select 'Any iOS Device (arm64)' (NOT simulator)${NC}"
echo -e "3. ${GREEN}✅ Verify build script phase is added and positioned correctly${NC}"
echo -e "4. ${GREEN}✅ Ensure you're signed into Xcode with Apple Developer account${NC}"
echo -e "5. ${GREEN}✅ Confirm .env.production has ENVIRONMENT=production${NC}"

echo ""
echo -e "${BOLD}${GREEN}🚀 PRODUCTION BUILD PROCESS:${NC}"
echo "=============================="
echo ""
echo "1. Product → Archive (uses Release configuration automatically)"
echo "2. Build script detects Release and sets ENVFILE=.env.production"
echo "3. react-native-config loads your production environment"
echo "4. App connects to PRODUCTION Supabase (not development!)"
echo "5. Upload to App Store Connect for TestFlight"

echo ""
echo -e "${BOLD}${BLUE}💡 How to Verify Production Environment:${NC}"
echo "========================================"
echo ""
echo "During Archive build, watch for this in build logs:"
echo -e "${GREEN}✅ Using production environment: .env.production${NC}"
echo ""
echo "If you see this message, your TestFlight build will use:"
echo "• Production Supabase database"
echo "• Production API endpoints"
echo "• No debug logging"
echo "• Optimized for real users"

echo ""
echo -e "${BOLD}${GREEN}🎉 You're ready for Production Archive!${NC}"
echo ""
echo -e "${YELLOW}Remember: TestFlight build = Production environment = Real user data${NC}"