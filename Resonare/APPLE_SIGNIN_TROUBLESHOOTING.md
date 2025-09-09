# 🍎 Apple Sign-In Troubleshooting Guide

## 🚨 Issue: "Apple Authentication library not properly linked" (After Pod Install)

### **Symptoms:**
- ✅ `./verify-apple-signin.sh` shows "Apple Sign-In is READY!"
- ✅ `pod install` completed successfully
- ❌ Still seeing "Apple Authentication library not properly linked" in app logs
- ❌ Apple Sign-In button not showing

### **Root Cause:**
The app is running from a build that was created **before** the pods were installed. React Native needs to be rebuilt to pick up the newly linked native modules.

### **Solution:**

#### Option 1: Quick Rebuild (Recommended)
```bash
./rebuild-with-apple-signin.sh
```

#### Option 2: Manual Rebuild
```bash
# Stop the current Metro bundler (Ctrl+C if running)

# Clean and rebuild
npx @react-native-community/cli start --reset-cache &
# Wait 3 seconds then kill Metro
pkill -f "react-native start" || pkill -f "metro"

# Clean iOS build
cd ios
xcodebuild clean -workspace Resonare.xcworkspace -scheme Resonare
cd ..

# Rebuild app (use development environment)
npm run ios:dev
```

#### Option 3: Nuclear Option (If above doesn't work)
```bash
# Clean everything
rm -rf node_modules
rm -rf ios/Pods
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/Resonare-*

# Reinstall everything
npm install
cd ios
pod install
cd ..

# Rebuild (use development environment)
npm run ios:dev
```

### **Expected Results After Rebuild:**

✅ **Console logs should show:**
- No more "Apple Authentication library not properly linked" messages
- Apple Sign-In availability detected

✅ **UI should show:**
- Apple Sign-In button appears alongside Google Sign-In (iOS only)
- Both buttons work correctly

✅ **Functionality:**
- Both authentication methods create proper user profiles
- Seamless switching between providers

### **Verification Steps:**

1. **Check Console Logs:**
   ```
   // Should NOT see:
   ❌ Apple Authentication library not properly linked
   
   // Should see:
   ✅ Apple Sign-In availability detected (or no error messages)
   ```

2. **Check UI:**
   - iOS: Two sign-in buttons (Google + Apple)
   - Android: One sign-in button (Google only)

3. **Test Functionality:**
   - Try Apple Sign-In on iOS device
   - Verify user profile creation
   - Test app features after sign-in

### **Still Having Issues?**

#### Check Build Target:
Make sure you're opening the **workspace** not the project:
```bash
# Correct:
open ios/Resonare.xcworkspace

# Incorrect:
open ios/Resonare.xcodeproj
```

#### Check Xcode Settings:
1. Open `ios/Resonare.xcworkspace`
2. Select Resonare project → Resonare target
3. Build Settings → Search for "Apple"
4. Verify Apple Sign-In capability is enabled

#### Check Device Requirements:
- Apple Sign-In requires iOS 13+
- Test on physical device (may not work in simulator)
- Ensure Apple ID is signed in on device

### **Why This Happens:**

React Native apps with native dependencies need to be rebuilt when:
1. New native modules are added
2. Pods are installed/updated
3. Native configurations change

The JavaScript code can hot-reload, but native modules require a full rebuild to be properly linked.

This is normal React Native behavior - not a bug with our Apple Sign-In integration! 🍎