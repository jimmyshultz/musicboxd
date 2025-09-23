echo "3. Checking for common issues..."

# Check if GoogleService-Info.plist exists
if [ ! -f "GoogleService-Info.plist" ]; then
    echo "❌ GoogleService-Info.plist is missing!"
    echo "   Make sure you've renamed your Google config file correctly."
else
    echo "✅ GoogleService-Info.plist found"
fi

# Check Info.plist for empty location description
if grep -q "<string></string>" Resonare/Info.plist; then
    echo "❌ Found empty strings in Info.plist - this can cause crashes"
    echo "   Please check all usage descriptions have proper text"
else
    echo "✅ Info.plist usage descriptions look good"
fi

echo "4. Validating entitlements..."
if [ -f "Resonare/Resonare.entitlements" ]; then
    echo "✅ Entitlements file found"
    # Check if entitlements are valid XML
    if plutil -lint Resonare/Resonare.entitlements > /dev/null 2>&1; then
        echo "✅ Entitlements file is valid"
    else
        echo "❌ Entitlements file has XML errors"
    fi
else
    echo "❌ Entitlements file missing"
fi

echo "5. Building for archive..."
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
    echo "   1. Open Resonare.xcworkspace in Xcode"
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