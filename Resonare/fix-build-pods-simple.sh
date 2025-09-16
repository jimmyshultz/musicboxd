#!/bin/bash

# Simple fix for CocoaPods build integration
# This modifies the Xcode project to auto-run pod install during builds

set -e

echo "🔧 Fixing CocoaPods build integration..."
echo "======================================"

cd "$(dirname "$0")"
PROJECT_FILE="ios/Resonare.xcodeproj/project.pbxproj"

if [ ! -f "$PROJECT_FILE" ]; then
    echo "❌ Error: Could not find $PROJECT_FILE"
    exit 1
fi

echo "📁 Found Xcode project file"

# Backup the original project file
cp "$PROJECT_FILE" "$PROJECT_FILE.backup"
echo "💾 Created backup: $PROJECT_FILE.backup"

# Create the new auto-install script
NEW_SCRIPT='# Auto-install CocoaPods if needed\nset -e\n\necho \"🔍 Checking CocoaPods synchronization...\"\n\nPODS_ROOT=\"${PODS_ROOT}\"\nPODFILE_DIR=\"${PODS_PODFILE_DIR_PATH}\"\nPODFILE_LOCK=\"${PODFILE_DIR}/Podfile.lock\"\nMANIFEST_LOCK=\"${PODS_ROOT}/Manifest.lock\"\n\n# Check if pods need to be installed\nif [ ! -d \"${PODS_ROOT}\" ] || [ ! -f \"${MANIFEST_LOCK}\" ] || ! diff \"${PODFILE_LOCK}\" \"${MANIFEST_LOCK}\" > /dev/null 2>&1; then\n  echo \"⚠️  CocoaPods out of sync. Running pod install...\"\n  \n  cd \"${PODFILE_DIR}\"\n  \n  # Check if pod command exists\n  if ! command -v pod &> /dev/null; then\n    echo \"❌ Error: pod command not found. Please install CocoaPods:\"\n    echo \"   sudo gem install cocoapods\"\n    exit 1\n  fi\n  \n  # Run pod install\n  pod install\n  \n  if [ $? -eq 0 ]; then\n    echo \"✅ CocoaPods installation completed successfully\"\n  else\n    echo \"❌ Error: pod install failed\"\n    exit 1\n  fi\nelse\n  echo \"✅ CocoaPods already in sync\"\nfi\n\n# Output success for Xcode\necho \"SUCCESS\" > \"${SCRIPT_OUTPUT_FILE_0}\"\n'

# Replace the existing CocoaPods check script
echo "🔄 Modifying CocoaPods build phase..."

# Use sed to replace the problematic script
sed -i.tmp 's/diff "${PODS_PODFILE_DIR_PATH}\/Podfile.lock" "${PODS_ROOT}\/Manifest.lock" > \/dev\/null\\nif \[ $? != 0 \] ; then\\n    # print error to STDERR\\n    echo "error: The sandbox is not in sync with the Podfile.lock. Run '\''pod install'\'' or update your CocoaPods installation." >&2\\n    exit 1\\nfi\\n# This output is used by Xcode '\''outputs'\'' to avoid re-running this script phase.\\necho "SUCCESS" > "${SCRIPT_OUTPUT_FILE_0}"/'"$NEW_SCRIPT"'/g' "$PROJECT_FILE"

# Check if the replacement was successful
if grep -q "Auto-install CocoaPods if needed" "$PROJECT_FILE"; then
    echo "✅ Successfully modified CocoaPods build phase"
    rm "$PROJECT_FILE.tmp" 2>/dev/null || true
else
    echo "⚠️  Direct replacement failed. Using alternative approach..."
    
    # Restore from backup and try a different approach
    cp "$PROJECT_FILE.backup" "$PROJECT_FILE"
    
    # Find the line with the problematic script and replace it
    python3 -c "
import re

with open('$PROJECT_FILE', 'r') as f:
    content = f.read()

# Find and replace the CocoaPods check script
old_pattern = r'shellScript = \"diff.*?echo \\\"SUCCESS\\\" > \\\".*?SCRIPT_OUTPUT_FILE_0.*?\";'
new_script = '''shellScript = \"# Auto-install CocoaPods if needed\\nset -e\\n\\necho \\\"🔍 Checking CocoaPods synchronization...\\\"\\n\\nPODS_ROOT=\\\"\${PODS_ROOT}\\\"\\nPODFILE_DIR=\\\"\${PODS_PODFILE_DIR_PATH}\\\"\\nPODFILE_LOCK=\\\"\${PODFILE_DIR}/Podfile.lock\\\"\\nMANIFEST_LOCK=\\\"\${PODS_ROOT}/Manifest.lock\\\"\\n\\n# Check if pods need to be installed\\nif [ ! -d \\\"\${PODS_ROOT}\\\" ] || [ ! -f \\\"\${MANIFEST_LOCK}\\\" ] || ! diff \\\"\${PODFILE_LOCK}\\\" \\\"\${MANIFEST_LOCK}\\\" > /dev/null 2>&1; then\\n  echo \\\"⚠️  CocoaPods out of sync. Running pod install...\\\"\\n  \\n  cd \\\"\${PODFILE_DIR}\\\"\\n  \\n  # Check if pod command exists\\n  if ! command -v pod &> /dev/null; then\\n    echo \\\"❌ Error: pod command not found. Please install CocoaPods:\\\"\\n    echo \\\"   sudo gem install cocoapods\\\"\\n    exit 1\\n  fi\\n  \\n  # Run pod install\\n  pod install\\n  \\n  if [ \$? -eq 0 ]; then\\n    echo \\\"✅ CocoaPods installation completed successfully\\\"\\n  else\\n    echo \\\"❌ Error: pod install failed\\\"\\n    exit 1\\n  fi\\nelse\\n  echo \\\"✅ CocoaPods already in sync\\\"\\nfi\\n\\n# Output success for Xcode\\necho \\\"SUCCESS\\\" > \\\"\${SCRIPT_OUTPUT_FILE_0}\\\"\";'''

new_content = re.sub(old_pattern, new_script, content, flags=re.DOTALL)

with open('$PROJECT_FILE', 'w') as f:
    f.write(new_content)
    
print('Python replacement completed')
"
    
    # Verify the change
    if grep -q "Auto-install CocoaPods if needed" "$PROJECT_FILE"; then
        echo "✅ Successfully modified CocoaPods build phase (using Python)"
    else
        echo "❌ Failed to modify build phase. Manual intervention needed."
        echo "Please restore from backup: cp $PROJECT_FILE.backup $PROJECT_FILE"
        exit 1
    fi
fi

# Also update the build phase name if possible
sed -i.tmp2 's/name = "\[CP\] Check Pods Manifest.lock";/name = "[CP] Auto-Install Pods";/g' "$PROJECT_FILE" 2>/dev/null || true
rm "$PROJECT_FILE.tmp2" 2>/dev/null || true

echo ""
echo "🎉 Successfully integrated pod install into build process!"
echo "======================================================"
echo ""
echo "📋 What this does:"
echo "• Automatically checks if CocoaPods are in sync before building"
echo "• Runs 'pod install' automatically if pods are missing or out of sync"
echo "• Shows progress in Xcode build log"
echo "• Prevents the build errors you were experiencing"
echo ""
echo "📱 Next steps:"
echo "1. Open Resonare.xcworkspace in Xcode"
echo "2. Try Product → Archive (or any build)"
echo "3. Watch the build log - you'll see CocoaPods status messages"
echo "4. The build should now succeed without manual pod install"
echo ""
echo "🔍 To verify the change:"
echo "grep -A 10 'Auto-install CocoaPods' ios/Resonare.xcodeproj/project.pbxproj"
echo ""
echo "🔄 To revert if needed:"
echo "cp ios/Resonare.xcodeproj/project.pbxproj.backup ios/Resonare.xcodeproj/project.pbxproj"