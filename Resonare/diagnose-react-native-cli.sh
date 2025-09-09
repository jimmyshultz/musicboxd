#!/bin/bash

echo "🔧 React Native CLI Diagnostic"
echo "=============================="
echo ""

# Check current directory
echo "📁 Current directory: $(pwd)"
echo ""

# Check if we're in the right project
if [ -f "package.json" ]; then
    echo "✅ Found package.json"
    PROJECT_NAME=$(grep '"name"' package.json | sed 's/.*": "//' | sed 's/",*//')
    echo "   Project name: $PROJECT_NAME"
else
    echo "❌ No package.json found - are you in the right directory?"
    exit 1
fi
echo ""

# Check Node and npm versions
echo "🔍 Environment check:"
echo "   Node version: $(node --version)"
echo "   npm version: $(npm --version)"
echo ""

# Check if npx is available
echo "📦 npx check:"
if command -v npx >/dev/null 2>&1; then
    echo "✅ npx is available"
    echo "   npx version: $(npx --version)"
else
    echo "❌ npx not found"
    exit 1
fi
echo ""

# Check React Native CLI installation
echo "⚛️  React Native CLI check:"
if [ -f "node_modules/.bin/react-native" ]; then
    echo "✅ React Native CLI found in node_modules"
else
    echo "❌ React Native CLI not found in node_modules"
fi
echo ""

# Test React Native CLI commands
echo "🧪 Testing React Native CLI commands:"

echo "   Testing --version:"
npx react-native --version 2>&1 | head -3

echo ""
echo "   Testing --help:"
npx react-native --help 2>&1 | head -5

echo ""
echo "   Testing run-ios --help:"
npx react-native run-ios --help 2>&1 | head -5

echo ""
echo "   Testing start --help:"
npx react-native start --help 2>&1 | head -5

echo ""

# Check for Xcode (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS/Xcode check:"
    if command -v xcodebuild >/dev/null 2>&1; then
        echo "✅ xcodebuild found"
        echo "   Xcode version: $(xcodebuild -version | head -1)"
    else
        echo "❌ xcodebuild not found - Xcode may not be installed"
    fi
    
    if command -v xcrun >/dev/null 2>&1; then
        echo "✅ xcrun found"
    else
        echo "❌ xcrun not found"
    fi
else
    echo "ℹ️  Not running on macOS - skipping Xcode check"
fi

echo ""
echo "🎯 Recommendations:"

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "1. If you see 'unknown command' errors, try:"
    echo "   npm install --save-dev @react-native-community/cli"
    echo ""
    echo "2. If xcodebuild is missing, install Xcode from App Store"
    echo ""
    echo "3. Try running commands directly:"
    echo "   npx react-native run-ios --scheme Resonare"
    echo ""
    echo "4. If still failing, try:"
    echo "   npx react-native doctor"
else
    echo "1. This diagnostic is running in a non-macOS environment"
    echo "2. iOS builds require macOS with Xcode installed"
    echo "3. Run this script on your local Mac for proper diagnosis"
fi

echo ""