#!/bin/bash

echo "🍎 Apple Sign-In Debug Information"
echo "================================="
echo ""

# Check current directory
echo "📁 Current directory: $(pwd)"
echo ""

# Check if package.json has the dependency
echo "📦 Checking package.json dependency..."
if grep -q "@invertase/react-native-apple-authentication" package.json; then
    VERSION=$(grep "@invertase/react-native-apple-authentication" package.json | sed 's/.*": "//' | sed 's/",*//')
    echo "✅ Found in package.json: $VERSION"
else
    echo "❌ NOT found in package.json"
fi
echo ""

# Check if it's installed in node_modules
echo "📂 Checking node_modules installation..."
if [ -d "node_modules/@invertase/react-native-apple-authentication" ]; then
    echo "✅ Found in node_modules"
    echo "📄 Package info:"
    if [ -f "node_modules/@invertase/react-native-apple-authentication/package.json" ]; then
        VERSION=$(grep '"version"' node_modules/@invertase/react-native-apple-authentication/package.json | sed 's/.*": "//' | sed 's/",*//')
        echo "   Version: $VERSION"
    fi
    echo "📁 Contents:"
    ls -la node_modules/@invertase/react-native-apple-authentication/ | head -10
else
    echo "❌ NOT found in node_modules"
fi
echo ""

# Check iOS specific files
echo "🍎 Checking iOS configuration..."
if [ -f "ios/Podfile" ]; then
    echo "✅ Podfile exists"
    if grep -q "RNAppleAuthentication" ios/Podfile 2>/dev/null; then
        echo "✅ RNAppleAuthentication found in Podfile"
    else
        echo "ℹ️  RNAppleAuthentication not explicitly in Podfile (auto-linking expected)"
    fi
else
    echo "❌ Podfile not found"
fi

if [ -f "ios/Podfile.lock" ]; then
    echo "✅ Podfile.lock exists"
    if grep -q "RNAppleAuthentication" ios/Podfile.lock 2>/dev/null; then
        echo "✅ RNAppleAuthentication found in Podfile.lock"
        LOCK_VERSION=$(grep -A 1 "RNAppleAuthentication" ios/Podfile.lock | tail -1 | sed 's/.*(//' | sed 's/).*//')
        echo "   Locked version: $LOCK_VERSION"
    else
        echo "❌ RNAppleAuthentication NOT found in Podfile.lock"
    fi
else
    echo "❌ Podfile.lock not found"
fi

if [ -d "ios/Pods" ]; then
    echo "✅ ios/Pods directory exists"
    if [ -d "ios/Pods/RNAppleAuthentication" ]; then
        echo "✅ RNAppleAuthentication pod installed"
    else
        echo "❌ RNAppleAuthentication pod NOT found in ios/Pods"
        echo "📁 Available pods:"
        ls ios/Pods/ | grep -i apple || echo "   No Apple-related pods found"
    fi
else
    echo "❌ ios/Pods directory not found"
fi
echo ""

# Check entitlements
echo "🔐 Checking entitlements..."
if [ -f "ios/Resonare/Resonare.entitlements" ]; then
    echo "✅ Entitlements file exists"
    if grep -q "com.apple.developer.applesignin" ios/Resonare/Resonare.entitlements 2>/dev/null; then
        echo "✅ Apple Sign-In entitlement found"
    else
        echo "❌ Apple Sign-In entitlement NOT found"
    fi
else
    echo "❌ Entitlements file not found"
fi
echo ""

# Check for common issues
echo "🔍 Common Issues Check..."
echo ""

if [ ! -d "ios/Pods" ]; then
    echo "⚠️  ISSUE: ios/Pods directory missing"
    echo "   SOLUTION: Run 'cd ios && pod install'"
    echo ""
fi

if [ -d "ios/Pods" ] && [ ! -d "ios/Pods/RNAppleAuthentication" ]; then
    echo "⚠️  ISSUE: Apple Authentication pod not installed"
    echo "   SOLUTION: Run 'cd ios && pod install' and rebuild app"
    echo ""
fi

echo "🎯 Next Steps:"
echo "1. Check the console logs when you restart the app"
echo "2. Look for lines starting with '🍎 [DEBUG]'"
echo "3. This will show exactly what's happening with the import"
echo ""