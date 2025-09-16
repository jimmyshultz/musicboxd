# Phase 5.1 Build Errors Solution

## 🚨 The Problem

You're encountering CocoaPods build errors when trying to archive your app for Phase 5.1. The specific errors you're seeing:

```
Error: Unable to open base configuration reference file '/Volumes/workspace/repository/Resonare/ios/Pods/Target Support Files/Pods-Resonare/Pods-Resonare.release.xcconfig'.
Error: Unable to load contents of file list: '/Target Support Files/Pods-Resonare/Pods-Resonare-*-files.xcfilelist'
```

## 🔍 Root Cause

These errors occur because:

1. **Missing Pods Directory**: The `ios/Pods/` directory is missing or corrupted
2. **Stale CocoaPods Cache**: Old cached files are conflicting with the build
3. **Xcode Build Cache**: Derived data is pointing to non-existent files
4. **Dependency Sync Issues**: npm and pod dependencies are out of sync

## ✅ Solution

### Option 1: Quick Fix (Run on your Mac)

```bash
# Navigate to your project
cd /path/to/your/Resonare/project

# Run the automated fix script
./fix-cocoapods-build-errors.sh
```

### Option 2: Manual Steps (If you prefer step-by-step)

#### Step 1: Clean Everything
```bash
# Clean npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Clean CocoaPods
cd ios
rm -rf Pods/ Podfile.lock
rm -rf ~/Library/Caches/CocoaPods
```

#### Step 2: Clean Xcode Cache
```bash
# Remove Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

#### Step 3: Reinstall Pods
```bash
# Still in the ios/ directory
pod repo update
pod install
```

#### Step 4: Clean and Build in Xcode
1. Open `Resonare.xcworkspace` (NOT .xcodeproj)
2. **Product → Clean Build Folder** (⌘⇧K)
3. Select **"Any iOS Device (arm64)"** or your connected device
4. **Product → Archive**

## 🎯 Why This Happens During Phase 5.1

Phase 5.1 involves creating archive builds for production, which:

1. **Uses Release Configuration**: Different from debug builds you've been using
2. **Stricter Requirements**: Archive builds have stricter file path requirements
3. **Missing Target Support Files**: CocoaPods generates different files for Release vs Debug

## 📋 To Answer Your Original Question

> Does npm install and pod install need to run somewhere between me triggering the archive build in XCode locally and viewing the failed build in appstoreconnect online?

**Answer**: No, but they need to run BEFORE you trigger the archive build. Here's the correct sequence:

### Correct Build Process for Phase 5.1:

1. **On your local Mac**:
   ```bash
   npm install                    # Install JS dependencies
   cd ios && pod install         # Install native dependencies
   ```

2. **In Xcode**:
   - Open `Resonare.xcworkspace`
   - Product → Clean Build Folder
   - Product → Archive

3. **Upload to App Store Connect**:
   - Xcode Organizer → Distribute App
   - Upload to App Store Connect

4. **View in App Store Connect**:
   - Build appears in TestFlight after processing (10-15 minutes)

## 🚨 Common Mistakes

❌ **Don't do this**:
- Opening `.xcodeproj` instead of `.xcworkspace`
- Running `npm install` or `pod install` after starting the archive
- Trying to build without cleaning first

✅ **Do this**:
- Always use `.xcworkspace`
- Clean everything before archiving
- Run dependencies installation before opening Xcode

## 🔧 Additional Troubleshooting

### If the script doesn't work:

1. **Check CocoaPods Version**:
   ```bash
   pod --version
   # Should be 1.10.0 or higher
   ```

2. **Update CocoaPods** (if needed):
   ```bash
   sudo gem install cocoapods
   ```

3. **Check Node Version**:
   ```bash
   node --version
   # Should be 18.x or higher (as specified in package.json)
   ```

4. **Verify Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```

### If you still get errors:

1. **Check Bundle Identifier**: Make sure it matches in:
   - Xcode project settings
   - App Store Connect
   - Apple Developer Portal

2. **Verify Signing**: Ensure your Apple Developer team is selected in Xcode

3. **Check Dependencies**: Look for any deprecated or incompatible packages

## 🎉 Success Indicators

You'll know it's fixed when:

- ✅ No "Unable to open base configuration" errors
- ✅ Archive builds successfully in Xcode
- ✅ Build uploads to App Store Connect without errors
- ✅ Build appears in TestFlight after processing

## 📞 Need More Help?

If you're still having issues after following this guide:

1. Share the exact error messages from Xcode
2. Confirm you're using `Resonare.xcworkspace`
3. Verify your macOS and Xcode versions
4. Check that you have an active Apple Developer account

The key is that CocoaPods and npm dependencies must be properly installed and synchronized BEFORE you attempt to create an archive build in Xcode.