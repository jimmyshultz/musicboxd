#!/bin/bash

# Verify Archive Build Readiness for Resonare iOS App
# Run this script on your Mac to verify everything is ready for archiving

echo "🔍 Verifying Resonare Archive Build Readiness..."

# Make sure we're in the Resonare directory
if [ ! -d "ios" ]; then
    echo "❌ Error: This script must be run from the Resonare project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected to find 'ios' subdirectory"
    exit 1
fi

# Navigate to iOS directory
cd ios

echo ""
echo "📁 Checking file locations..."

# Check if GoogleService-Info.plist exists
if [ -f "GoogleService-Info.plist" ]; then
    echo "✅ GoogleService-Info.plist found"
    # Check if it's a valid plist
    if plutil -lint GoogleService-Info.plist > /dev/null 2>&1; then
        echo "✅ GoogleService-Info.plist is valid XML"
    else
        echo "⚠️  GoogleService-Info.plist has XML issues - check the file"
    fi
else
    echo "❌ GoogleService-Info.plist is missing!"
    echo "   Expected location: $(pwd)/GoogleService-Info.plist"
fi

# Check Info.plist
if [ -f "Resonare/Info.plist" ]; then
    echo "✅ Info.plist found"
    if plutil -lint Resonare/Info.plist > /dev/null 2>&1; then
        echo "✅ Info.plist is valid XML"
    else
        echo "❌ Info.plist has XML errors"
    fi
    
    # Check for empty location description
    if grep -q "<string></string>" Resonare/Info.plist; then
        echo "⚠️  Found empty strings in Info.plist - this can cause crashes"
    else
        echo "✅ Info.plist usage descriptions look good"
    fi
else
    echo "❌ Info.plist not found at Resonare/Info.plist"
fi

# Check entitlements
if [ -f "Resonare/Resonare.entitlements" ]; then
    echo "✅ Entitlements file found"
    if plutil -lint Resonare/Resonare.entitlements > /dev/null 2>&1; then
        echo "✅ Entitlements file is valid XML"
    else
        echo "❌ Entitlements file has XML errors"
    fi
else
    echo "❌ Entitlements file missing"
fi

# Check workspace
if [ -f "Resonare.xcworkspace/contents.xcworkspacedata" ]; then
    echo "✅ Xcode workspace found"
else
    echo "❌ Xcode workspace missing"
    exit 1
fi

echo ""
echo "🏗️  Testing Release build..."

# Test the build
xcodebuild -workspace Resonare.xcworkspace \
    -scheme Resonare \
    -configuration Release \
    -destination generic/platform=iOS \
    build \
    2>&1 | head -20

BUILD_RESULT=$?

echo ""
if [ $BUILD_RESULT -eq 0 ]; then
    echo "✅ Release build successful!"
    echo ""
    echo "🎉 Your app is ready for archiving!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Open ios/Resonare.xcworkspace in Xcode"
    echo "   2. Select 'Any iOS Device' (not simulator) as the destination"
    echo "   3. Go to Product > Archive"
    echo "   4. Wait for the archive to complete"
    echo "   5. Export the IPA and test on your device"
    echo ""
    echo "💡 Tips:"
    echo "   - Make sure you're signed in to your Apple Developer account in Xcode"
    echo "   - Verify your certificates and provisioning profiles are up to date"
    echo "   - Test the final IPA on a physical device"
else
    echo "❌ Release build failed"
    echo ""
    echo "🔧 Try these fixes:"
    echo "   1. Clean build folder: Product > Clean Build Folder in Xcode"
    echo "   2. Delete derived data: ~/Library/Developer/Xcode/DerivedData/Resonare-*"
    echo "   3. Run 'pod install' in the ios directory"
    echo "   4. Check for any code signing issues in Xcode"
fi

echo ""
echo "📊 Build Summary:"
echo "   GoogleService-Info.plist: $([ -f "GoogleService-Info.plist" ] && echo "✅" || echo "❌")"
echo "   Info.plist: $([ -f "Resonare/Info.plist" ] && echo "✅" || echo "❌")"
echo "   Entitlements: $([ -f "Resonare/Resonare.entitlements" ] && echo "✅" || echo "❌")"
echo "   Workspace: $([ -f "Resonare.xcworkspace/contents.xcworkspacedata" ] && echo "✅" || echo "❌")"
echo "   Release Build: $([ $BUILD_RESULT -eq 0 ] && echo "✅" || echo "❌")"