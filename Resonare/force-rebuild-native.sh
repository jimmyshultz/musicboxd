#!/bin/bash

echo "🔨 Force Rebuild Native Modules"
echo "==============================="
echo ""

echo "This will force a complete rebuild to link the Apple Authentication native module."
echo ""

echo "📱 Step 1: Clean everything..."
echo ""

# Clean iOS build
if [ -d "ios" ]; then
    echo "🍎 Cleaning iOS build..."
    cd ios
    if command -v xcodebuild >/dev/null 2>&1; then
        xcodebuild clean -workspace Resonare.xcworkspace -scheme Resonare 2>/dev/null || echo "   Xcode clean completed"
    else
        echo "   xcodebuild not available, skipping iOS clean"
    fi
    cd ..
else
    echo "❌ ios directory not found"
fi

echo ""
echo "📦 Step 2: Clean React Native cache..."
if command -v npx >/dev/null 2>&1; then
    npx react-native start --reset-cache &
    METRO_PID=$!
    sleep 3
    kill $METRO_PID 2>/dev/null || true
    echo "   React Native cache cleared"
else
    echo "   npx not available, skipping cache clear"
fi

echo ""
echo "🔥 Step 3: Clean derived data (iOS)..."
if [ -d "$HOME/Library/Developer/Xcode/DerivedData" ]; then
    echo "   Cleaning Xcode DerivedData..."
    rm -rf "$HOME/Library/Developer/Xcode/DerivedData/Resonare-"* 2>/dev/null || true
    echo "   DerivedData cleaned"
else
    echo "   DerivedData directory not found"
fi

echo ""
echo "🚀 Step 4: Rebuild app..."
echo ""

if [ -f "package.json" ]; then
    echo "Starting rebuild with development environment..."
    ENVFILE=.env.development npm run ios
else
    echo "❌ package.json not found. Are you in the right directory?"
    exit 1
fi

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "🔍 What to check:"
echo "1. Look for Apple Sign-In button alongside Google Sign-In"
echo "2. Check console for '🍎 [DEBUG] appleAuth.native exists: true'"
echo "3. Test Apple Sign-In functionality"
echo ""