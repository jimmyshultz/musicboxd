# 🍎 Apple Sign-In Setup Instructions

> **Current Status**: Apple Sign-In code is integrated but requires native iOS linking to function.

## 🚨 Why Apple Sign-In Button Isn't Showing

The logs show:
```
Apple Authentication library not properly linked
```

This is expected! The React Native Apple Authentication library requires native iOS dependencies (CocoaPods) that need to be installed in your local development environment.

## ✅ What's Already Done

- [x] Apple Authentication library added to package.json
- [x] iOS Podfile updated with Apple Authentication pod
- [x] AuthService updated with Apple Sign-In methods
- [x] AuthScreen updated with Apple Sign-In button
- [x] Redux store updated with Apple Sign-In actions
- [x] Error handling implemented (no crashes!)
- [x] Graceful fallback to Google Sign-In only

## 🔧 Setup Steps for Your Local Environment

### Step 1: Install CocoaPods (if not already installed)
```bash
# Install CocoaPods
sudo gem install cocoapods

# Verify installation
pod --version
```

### Step 2: Install iOS Dependencies
```bash
# Navigate to your project
cd /path/to/your/Resonare

# Option A: Use the automated script
./install-pods.sh

# Option B: Manual installation
cd ios
pod install
cd ..
```

### Step 3: Rebuild the App
```bash
# Clean and rebuild
npm run ios

# Or with specific environment
ENVFILE=.env.development npm run ios
```

## 🎯 Expected Results After Setup

### Before Pod Installation:
- ❌ Apple Sign-In button: Hidden
- ✅ Google Sign-In button: Works perfectly
- ✅ App stability: No crashes
- ℹ️ Console message: "Apple Authentication library not properly linked"

### After Pod Installation:
- ✅ Apple Sign-In button: Appears on iOS devices
- ✅ Google Sign-In button: Still works perfectly
- ✅ Both sign-in methods: Create proper user profiles
- ✅ Console message: Apple Sign-In availability detected

## 📱 Testing Apple Sign-In

### Requirements:
- **Physical iOS device** (recommended - may not work in simulator)
- **Apple Developer account** (for production)
- **iOS 13+** (Apple Sign-In requirement)

### Test Flow:
1. Launch app on iOS device
2. See both Google and Apple Sign-In buttons
3. Tap Apple Sign-In button
4. Complete Apple authentication flow
5. Verify user profile creation in app

## 🐛 Troubleshooting

### Issue: "Apple Sign-In button still not showing"
**Solution:**
```bash
# Clean everything and rebuild
cd ios
pod deintegrate
pod clean
pod install
cd ..
npm start --reset-cache
npm run ios
```

### Issue: "Apple Sign-In fails in simulator"
**Solution:** Test on a physical iOS device - Apple Sign-In often doesn't work properly in simulators.

### Issue: "Build errors after pod install"
**Solution:**
1. Open `ios/Resonare.xcworkspace` (not .xcodeproj)
2. Clean build folder (Product → Clean Build Folder)
3. Build from Xcode

## 📋 Verification Checklist

After completing setup, verify:
- [ ] `pod install` completed without errors
- [ ] App builds and launches successfully
- [ ] Apple Sign-In button appears on iOS
- [ ] Google Sign-In still works
- [ ] Both authentication methods create user profiles
- [ ] No console errors related to Apple Authentication

## 🎉 Success!

Once setup is complete, your users will have both Google and Apple Sign-In options, providing a better user experience and meeting Apple's App Store requirements for apps with third-party authentication.

The app gracefully handles both authentication methods and creates consistent user profiles regardless of the chosen sign-in method.