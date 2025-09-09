#!/bin/bash

echo "🍎 Installing iOS Pods for Apple Sign-In..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Resonare project root directory"
    exit 1
fi

# Check if ios directory exists
if [ ! -d "ios" ]; then
    echo "❌ Error: ios directory not found"
    exit 1
fi

# Navigate to iOS directory and install pods
cd ios

echo "📦 Installing CocoaPods dependencies..."
if command -v pod >/dev/null 2>&1; then
    pod install
    echo ""
    echo "✅ Pods installed successfully!"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Run: npm run ios"
    echo "2. Test Apple Sign-In functionality on a physical iOS device"
    echo ""
    echo "📝 Note: Apple Sign-In may not work in iOS Simulator"
else
    echo "❌ Error: CocoaPods not found. Please install it first:"
    echo "   gem install cocoapods"
    exit 1
fi