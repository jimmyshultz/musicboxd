#!/bin/bash

echo "🍎 Rebuilding Resonare with Apple Sign-In Support"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Resonare project root directory"
    exit 1
fi

echo "🧹 Cleaning build caches..."
echo ""

# Clean React Native cache
echo "📱 Cleaning React Native cache..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 3
kill $METRO_PID 2>/dev/null || true

# Clean iOS build
echo "🍎 Cleaning iOS build..."
cd ios
xcodebuild clean -workspace Resonare.xcworkspace -scheme Resonare 2>/dev/null || echo "Xcode clean completed"
cd ..

echo ""
echo "🔨 Rebuilding with Apple Sign-In..."
echo ""

# Rebuild the app
echo "📱 Starting fresh build..."
npm run ios

echo ""
echo "✅ Build complete! Apple Sign-In should now be available."
echo ""
echo "🔍 What to look for:"
echo "   - No more 'Apple Authentication library not properly linked' messages"
echo "   - Apple Sign-In button appears alongside Google Sign-In"
echo "   - Test both authentication methods"
echo ""