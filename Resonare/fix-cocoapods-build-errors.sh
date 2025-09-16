#!/bin/bash

# Fix CocoaPods Build Errors Script
# Run this on your local Mac to resolve Phase 5.1 build issues

set -e

echo "🔧 Fixing CocoaPods build errors for Phase 5.1..."
echo "================================================="

# Step 1: Navigate to project directory
echo "📁 Step 1: Navigating to project directory..."
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)
echo "Project root: $PROJECT_ROOT"

# Step 2: Clean npm cache and reinstall dependencies
echo ""
echo "🧹 Step 2: Cleaning npm cache and reinstalling dependencies..."
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Step 3: Clean CocoaPods installation
echo ""
echo "🧹 Step 3: Cleaning CocoaPods installation..."
cd ios
rm -rf Pods/ Podfile.lock
rm -rf ~/Library/Caches/CocoaPods
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Step 4: Update CocoaPods repo (if needed)
echo ""
echo "📦 Step 4: Updating CocoaPods repository..."
pod repo update --silent || echo "⚠️  CocoaPods repo update failed, continuing..."

# Step 5: Install pods with verbose output
echo ""
echo "📦 Step 5: Installing CocoaPods dependencies..."
pod install --verbose

# Step 6: Clean Xcode build cache
echo ""
echo "🧹 Step 6: Cleaning Xcode build cache..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Step 7: Verify installation
echo ""
echo "✅ Step 7: Verifying installation..."
if [ -d "Pods" ] && [ -f "Podfile.lock" ]; then
    echo "✅ CocoaPods installation successful!"
    echo "✅ Pods directory exists"
    echo "✅ Podfile.lock created"
else
    echo "❌ CocoaPods installation may have failed"
    exit 1
fi

# Step 8: Instructions for Xcode
echo ""
echo "🎯 Step 8: Next steps for Xcode..."
echo "================================================="
echo "1. Open Resonare.xcworkspace (NOT .xcodeproj)"
echo "2. Clean Build Folder: Product → Clean Build Folder"
echo "3. Select 'Any iOS Device (arm64)' or your connected device"
echo "4. Try building again: Product → Build"
echo ""
echo "For Archive builds:"
echo "1. Product → Archive"
echo "2. Wait for build to complete"
echo "3. Upload to App Store Connect"
echo ""
echo "🎉 CocoaPods issues should now be resolved!"
echo "================================================="