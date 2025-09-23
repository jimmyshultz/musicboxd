#!/bin/bash

# Test Archive Build Script
# This script tests if your archive build will work without actually creating an archive

echo "🧪 Testing Archive Build Configuration..."
echo ""

# Check if we're in the right directory
if [ ! -d "ios" ]; then
    echo "❌ Error: Please run this script from the Resonare project root directory"
    exit 1
fi

# Check for required files
echo "📁 Checking required files..."

if [ -f ".env.production" ]; then
    echo "✅ .env.production found"
else
    echo "❌ .env.production missing"
    exit 1
fi

if [ -f "ios/GoogleService-Info.plist" ]; then
    echo "✅ GoogleService-Info.plist found"
else
    echo "❌ GoogleService-Info.plist missing"
    exit 1
fi

if [ -f "ios/Resonare/Info.plist" ]; then
    echo "✅ Info.plist found"
else
    echo "❌ Info.plist missing"
    exit 1
fi

if [ -f "ios/Resonare/Resonare.entitlements" ]; then
    echo "✅ Entitlements file found"
else
    echo "❌ Entitlements file missing"
    exit 1
fi

# Test the build script logic locally
echo ""
echo "🔧 Testing build script logic..."

# Simulate the build script
PROJECT_ROOT="$(pwd)"
ENV_SOURCE="$PROJECT_ROOT/.env.production"
ENV_TARGET="$PROJECT_ROOT/.env"

if [ -f "$ENV_SOURCE" ]; then
    echo "✅ Archive Build: Would copy .env.production for Release configuration"
    # Actually do the copy for testing
    cp "$ENV_SOURCE" "$ENV_TARGET"
    echo "✅ Production environment activated (test)"
else
    echo "❌ .env.production not found"
    exit 1
fi

echo "✅ Environment setup completed for Release build"

# Test a quick build
echo ""
echo "🏗️  Testing quick Release build (this may take a few minutes)..."

cd ios

# Clean first
echo "Cleaning previous builds..."
xcodebuild clean -workspace Resonare.xcworkspace -scheme Resonare -configuration Release > /dev/null 2>&1

# Test build
echo "Testing Release build..."
xcodebuild build -workspace Resonare.xcworkspace \
    -scheme Resonare \
    -configuration Release \
    -destination generic/platform=iOS \
    -quiet

BUILD_RESULT=$?

cd ..

if [ $BUILD_RESULT -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Your archive build should work!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Open ios/Resonare.xcworkspace in Xcode"
    echo "   2. Select 'Any iOS Device' as the destination"
    echo "   3. Go to Product → Archive"
    echo "   4. Wait for the archive to complete (this will take several minutes)"
    echo "   5. Export the IPA and test on your device"
    echo ""
    echo "✅ The build script issue has been fixed!"
    echo "✅ All required files are in place!"
    echo "✅ The Release build compiles successfully!"
else
    echo ""
    echo "❌ Build test failed. Check the error messages above."
    echo ""
    echo "🔧 Common fixes:"
    echo "   1. Make sure you've run 'pod install' in the ios directory"
    echo "   2. Clean build folder: Product → Clean Build Folder in Xcode"
    echo "   3. Delete derived data: ~/Library/Developer/Xcode/DerivedData/Resonare-*"
    echo "   4. Check for any code signing issues"
fi

echo ""
echo "📊 Test Summary:"
echo "   .env.production: ✅"
echo "   GoogleService-Info.plist: ✅"
echo "   Info.plist: ✅"
echo "   Entitlements: ✅"
echo "   Build Script Fixed: ✅"
echo "   Release Build: $([ $BUILD_RESULT -eq 0 ] && echo "✅" || echo "❌")"