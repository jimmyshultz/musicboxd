#!/bin/bash

echo "🔧 React Native CLI Fix Script"
echo "============================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Resonare project root directory"
    exit 1
fi

echo "🧹 Step 1: Clean node_modules and reinstall..."
echo ""

# Remove node_modules and package-lock.json
rm -rf node_modules
rm -f package-lock.json

echo "📦 Step 2: Fresh npm install..."
npm install

echo ""
echo "🧪 Step 3: Test React Native CLI..."
echo ""

# Test the CLI
echo "Testing npx react-native --version:"
npx react-native --version

echo ""
echo "Testing npx react-native run-ios --help:"
npx react-native run-ios --help | head -5

echo ""
echo "🎯 Step 4: Try running the app..."
echo ""

echo "You can now try:"
echo "  ENVFILE=.env.development npm run ios"
echo ""
echo "Or directly:"
echo "  npx react-native run-ios --scheme Resonare"
echo ""

# Check for common issues
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v xcodebuild >/dev/null 2>&1; then
        echo "⚠️  Warning: xcodebuild not found. Please install Xcode from App Store."
    fi
    
    if [ ! -d "ios/Pods" ]; then
        echo "⚠️  Warning: iOS Pods not installed. Run: cd ios && pod install"
    fi
else
    echo "ℹ️  Note: This script is running on non-macOS. iOS builds require macOS with Xcode."
fi

echo ""
echo "✅ React Native CLI fix complete!"