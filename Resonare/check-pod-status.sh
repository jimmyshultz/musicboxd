#!/bin/bash

echo "🔍 Detailed Pod Installation Check"
echo "================================="
echo ""

# Run this in your local environment where you just ran pod install
echo "📁 Checking ios/Pods directory structure..."
if [ -d "ios/Pods" ]; then
    echo "✅ ios/Pods exists"
    echo ""
    echo "📂 All installed pods:"
    ls -1 ios/Pods/ | grep -v "Local Podspecs" | grep -v "Target Support Files" | head -20
    echo ""
    echo "🍎 Looking for Apple-related pods:"
    ls -1 ios/Pods/ | grep -i apple || echo "   No pods with 'apple' in name found"
    ls -1 ios/Pods/ | grep -i RN || echo "   No pods with 'RN' prefix found"
    echo ""
    echo "🔍 Searching for any Apple Authentication related files:"
    find ios/Pods -name "*Apple*" -type d 2>/dev/null | head -5 || echo "   No Apple directories found"
    find ios/Pods -name "*RNApple*" -type d 2>/dev/null | head -5 || echo "   No RNApple directories found"
else
    echo "❌ ios/Pods directory not found"
fi

echo ""
echo "📄 Checking Podfile.lock for RNAppleAuthentication..."
if [ -f "ios/Podfile.lock" ]; then
    echo "Searching for RNAppleAuthentication in Podfile.lock:"
    grep -A 5 -B 5 "RNAppleAuthentication" ios/Podfile.lock || echo "   Not found in Podfile.lock"
    echo ""
    echo "Searching for Apple in Podfile.lock:"
    grep -i apple ios/Podfile.lock || echo "   No Apple entries found"
else
    echo "❌ Podfile.lock not found"
fi

echo ""
echo "🔍 Checking auto-linking..."
echo "From your pod install output, these modules were auto-linked:"
echo "RNAppleAuthentication, RNCAsyncStorage, RNDateTimePicker, etc."
echo ""
echo "This suggests auto-linking is working, but the pod might not create a separate directory."
echo "Let's check if it's integrated differently..."

if [ -f "ios/Podfile.lock" ]; then
    echo ""
    echo "📊 Pod installation summary from Podfile.lock:"
    echo "Total pods mentioned: $(grep -c ":" ios/Podfile.lock)"
    echo ""
fi

echo "🎯 Next step: Restart your app and check the debug logs"
echo "The native module should now be available even if there's no separate pod directory."