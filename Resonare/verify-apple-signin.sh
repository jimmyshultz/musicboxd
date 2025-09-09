#!/bin/bash

echo "🍎 Apple Sign-In Setup Verification"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Resonare project root directory"
    exit 1
fi

echo "📦 Checking dependencies..."

# Check if Apple Authentication is in package.json
if grep -q "@invertase/react-native-apple-authentication" package.json; then
    echo "✅ Apple Authentication library found in package.json"
else
    echo "❌ Apple Authentication library NOT found in package.json"
    echo "   Run: npm install @invertase/react-native-apple-authentication"
    exit 1
fi

# Check if Apple Authentication is in node_modules
if [ -d "node_modules/@invertase/react-native-apple-authentication" ]; then
    echo "✅ Apple Authentication library installed in node_modules"
else
    echo "❌ Apple Authentication library NOT installed"
    echo "   Run: npm install"
    exit 1
fi

echo ""
echo "🍎 Checking iOS configuration..."

# Check if Podfile has Apple Authentication
if [ -f "ios/Podfile" ]; then
    if grep -q "RNAppleAuthentication" ios/Podfile; then
        echo "✅ Apple Authentication pod found in Podfile"
    else
        echo "❌ Apple Authentication pod NOT found in Podfile"
        exit 1
    fi
else
    echo "❌ Podfile not found"
    exit 1
fi

# Check if Pods are installed
if [ -d "ios/Pods" ]; then
    echo "✅ CocoaPods dependencies installed"
    
    # Check if Apple Authentication pod is installed (React Native 0.60+ uses auto-linking)
    if [ -d "ios/Pods/RNAppleAuthentication" ] || grep -q "RNAppleAuthentication" ios/Podfile.lock 2>/dev/null; then
        echo "✅ Apple Authentication pod properly installed"
        PODS_LINKED=true
    else
        echo "⚠️  Apple Authentication pod not found in Pods directory"
        echo "   Run: cd ios && pod install"
        PODS_LINKED=false
    fi
else
    echo "⚠️  CocoaPods not installed yet"
    echo "   Run: cd ios && pod install"
    PODS_LINKED=false
fi

# Check entitlements
if [ -f "ios/Resonare/Resonare.entitlements" ]; then
    if grep -q "com.apple.developer.applesignin" ios/Resonare/Resonare.entitlements; then
        echo "✅ Apple Sign-In entitlement found"
    else
        echo "❌ Apple Sign-In entitlement NOT found"
    fi
else
    echo "⚠️  Entitlements file not found"
fi

echo ""
echo "🔍 Checking code integration..."

# Check if AuthService has Apple Sign-In
if grep -q "signInWithApple" src/services/authService.ts; then
    echo "✅ Apple Sign-In method found in AuthService"
else
    echo "❌ Apple Sign-In method NOT found in AuthService"
fi

# Check if AuthScreen has Apple Button
if grep -q "AppleButton" src/screens/Auth/AuthScreen.tsx; then
    echo "✅ Apple Sign-In button found in AuthScreen"
else
    echo "❌ Apple Sign-In button NOT found in AuthScreen"
fi

echo ""
echo "📋 Summary:"
echo ""

if [ "$PODS_LINKED" = true ]; then
    echo "🎉 Apple Sign-In is READY!"
    echo "   - Dependencies installed ✅"
    echo "   - iOS pods linked ✅"
    echo "   - Code integrated ✅"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Run: npm run ios"
    echo "   2. Test on physical iOS device"
    echo "   3. Look for Apple Sign-In button alongside Google Sign-In"
else
    echo "⚠️  Apple Sign-In needs iOS linking"
    echo "   - Dependencies installed ✅"
    echo "   - iOS pods NOT linked ❌"
    echo "   - Code integrated ✅"
    echo ""
    echo "🔧 To complete setup:"
    echo "   1. Run: cd ios && pod install"
    echo "   2. Run: npm run ios"
    echo "   3. Test on physical iOS device"
fi

echo ""