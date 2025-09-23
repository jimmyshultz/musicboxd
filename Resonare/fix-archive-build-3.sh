#!/bin/bash

# Fix Archive Build Issues for Resonare iOS App
# This script addresses common issues that cause crashes in archive builds

echo "🔧 Fixing iOS Archive Build Issues..."

# Make sure we're in the Resonare directory
if [ ! -d "ios" ]; then
    echo "❌ Error: This script must be run from the Resonare project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected to find 'ios' subdirectory"
    exit 1
fi

# Navigate to iOS directory
cd ios

echo "3. Checking for common issues..."

# Check if GoogleService-Info.plist exists
if [ ! -f "GoogleService-Info.plist" ]; then
    echo "❌ GoogleService-Info.plist is missing!"
    echo "   Make sure you've renamed your Google config file correctly."
    echo "   Looking for file at: $(pwd)/GoogleService-Info.plist"
else
    echo "✅ GoogleService-Info.plist found at $(pwd)/GoogleService-Info.plist"
fi

# Check Info.plist for empty location description
if [ -f "Resonare/Info.plist" ]; then
    if grep -q "<string></string>" Resonare/Info.plist; then
        echo "❌ Found empty strings in Info.plist - this can cause crashes"
        echo "   Please check all usage descriptions have proper text"
    else
        echo "✅ Info.plist usage descriptions look good"
    fi
else
    echo "❌ Info.plist not found at Resonare/Info.plist"
fi

echo "4. Validating entitlements..."
if [ -f "Resonare/Resonare.entitlements" ]; then
    echo "✅ Entitlements file found at $(pwd)/Resonare/Resonare.entitlements"
    # Check if entitlements are valid XML
    if plutil -lint Resonare/Resonare.entitlements > /dev/null 2>&1; then
        echo "✅ Entitlements file is valid XML"
    else
        echo "❌ Entitlements file has XML errors"
    fi
else
    echo "❌ Entitlements file missing at $(pwd)/Resonare/Resonare.entitlements"
fi

echo "5. Checking workspace..."
if [ -f "Resonare.xcworkspace/contents.xcworkspacedata" ]; then
    echo "✅ Xcode workspace found"
else
    echo "❌ Xcode workspace missing"
    exit 1
fi

echo "6. Building for archive..."
echo "   Building with Release configuration to test archive compatibility..."

# Build for archive to test
xcodebuild -workspace Resonare.xcworkspace \
    -scheme Resonare \
    -configuration Release \
    -destination generic/platform=iOS \
    build

if [ $? -eq 0 ]; then
    echo "✅ Archive build test successful!"
    echo ""
    echo "🚀 Your app should now work when archived. Try creating a new archive in Xcode."
    echo ""
    echo "📋 Archive Steps:"
    echo "   1. Open ios/Resonare.xcworkspace in Xcode"
    echo "   2. Select 'Any iOS Device' as the destination"
    echo "   3. Go to Product > Archive"
    echo "   4. Once archived, export the IPA and test on your device"
else
    echo "❌ Archive build failed. Check the error messages above."
    echo "   You may need to fix additional issues before archiving."
fi

echo ""
echo "🔍 Additional troubleshooting tips:"
echo "   - Make sure your Apple Developer account and certificates are valid"
echo "   - Check that your bundle identifier matches your provisioning profile"
echo "   - Verify all required frameworks are properly linked"
echo "   - Test the archive on a physical device, not just the simulator"
echo ""
echo "📁 File locations verified:"
echo "   GoogleService-Info.plist: $(pwd)/GoogleService-Info.plist"
echo "   Info.plist: $(pwd)/Resonare/Info.plist"
echo "   Entitlements: $(pwd)/Resonare/Resonare.entitlements"
echo "   Workspace: $(pwd)/Resonare.xcworkspace"