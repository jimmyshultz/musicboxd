# 🚨 Crash Analytics Setup Guide

This guide explains how to complete the Firebase Crashlytics setup for crash reporting in TestFlight and production.

## ✅ What's Already Implemented

1. **Firebase Crashlytics packages installed**
   - `@react-native-firebase/app`
   - `@react-native-firebase/crashlytics`

2. **Crash Analytics Service** (`src/services/crashAnalytics.ts`)
   - Comprehensive error tracking
   - Environment-aware configuration
   - User identification and attributes
   - Custom logging and context

3. **Integration Points**
   - ErrorBoundary component updated
   - Logger service integrated
   - App initialization configured

4. **Android Configuration** ✅
   - `google-services.json` configured
   - Build gradle files updated
   - Firebase dependencies added

5. **iOS Configuration** ⚠️ (Needs completion)
   - `GoogleService-Info.plist` updated
   - Podfile updated (needs `pod install`)

## 🔧 Remaining Setup Steps

### 1. Complete iOS Setup

Run these commands in your development environment:

```bash
cd Resonare/ios
pod install
```

### 2. Firebase Console Setup

1. **Create/Configure Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create project named "resonare-app" (or use existing)
   - Enable Crashlytics in the project

2. **Add iOS App** (if not already done)
   - Bundle ID: `com.jimmyshultz.resonare`
   - Download and replace `GoogleService-Info.plist`

3. **Add Android App** (if not already done)
   - Package name: `com.jimmyshultz.resonare`
   - Download and replace `google-services.json`

### 3. Build Configuration

**iOS:**
- Ensure Xcode project includes Firebase Crashlytics
- Add build phase script for dSYM upload (for symbolication)

**Android:**
- Ensure ProGuard mapping files are uploaded for release builds

## 🧪 Testing Crash Analytics

### Development Testing

Use the built-in crash test screen (development only):

```typescript
import CrashTestScreen from './src/screens/CrashTestScreen';
```

### Manual Testing Functions

```typescript
import { 
  triggerTestCrash, 
  recordError, 
  recordNonFatalError 
} from './src/services/crashAnalytics';

// Test crash (development only)
triggerTestCrash();

// Test error recording
recordError(new Error('Test error'), { context: 'manual_test' });

// Test non-fatal error
recordNonFatalError(new Error('Non-fatal test'), { screen: 'TestScreen' });
```

## 📊 What You'll See in Firebase Console

### Crash Reports Include:
- **Stack traces** with file names and line numbers
- **Device information** (OS version, device model)
- **App version** and environment
- **Custom attributes** (user ID, environment, context)
- **Breadcrumb logs** leading up to crash
- **User impact** metrics

### Error Context:
- Component stack traces (from ErrorBoundary)
- Environment information (dev/staging/production)
- User attributes and custom data
- Timestamp and session information

## 🎯 TestFlight Integration

### Automatic Crash Reporting
- Crashes are automatically captured in TestFlight builds
- Reports appear in Firebase Console within minutes
- No user interaction required

### Beta Tester Experience
- App crashes are silent (no error overlays)
- Users can continue using app after restart
- Crash data is sent automatically

### What Beta Testers Won't See
- Console logs (suppressed in staging/production)
- React Native error overlays (disabled)
- Debug information (development only)

## 🔍 Monitoring & Alerts

### Firebase Console Features:
1. **Real-time crash monitoring**
2. **Crash-free user percentage**
3. **Most impacted users**
4. **Trending issues**
5. **Email alerts for new crashes**

### Recommended Alerts:
- New crash types detected
- Crash rate exceeds threshold
- Specific user experiencing multiple crashes

## 🚀 Production Checklist

Before releasing to TestFlight/App Store:

- [ ] Firebase project configured
- [ ] iOS pods installed (`pod install`)
- [ ] Android build successful
- [ ] Test crash analytics in development
- [ ] Verify Firebase Console receives test data
- [ ] Configure crash alerts
- [ ] Upload dSYM files for iOS symbolication
- [ ] Test in staging environment

## 📱 Environment Behavior

| Environment | Crash Collection | Console Logs | Error Overlays | Test Crashes |
|-------------|------------------|--------------|----------------|--------------|
| Development | ❌ Disabled | ✅ Enabled | ✅ Enabled | ✅ Allowed |
| Staging | ✅ Enabled | ❌ Suppressed | ❌ Disabled | ❌ Blocked |
| Production | ✅ Enabled | ❌ Suppressed | ❌ Disabled | ❌ Blocked |

## 🔧 Troubleshooting

### Common Issues:

1. **No crash reports appearing**
   - Check Firebase project configuration
   - Verify app bundle ID matches Firebase setup
   - Ensure crash collection is enabled

2. **iOS build fails**
   - Run `pod install` in ios directory
   - Check Xcode project settings
   - Verify Firebase SDK compatibility

3. **Android build fails**
   - Check `google-services.json` placement
   - Verify gradle plugin versions
   - Clean and rebuild project

### Debug Commands:

```bash
# Check Firebase configuration
npx react-native info

# Clean builds
cd android && ./gradlew clean
cd ios && xcodebuild clean

# Reinstall dependencies
npm install && cd ios && pod install
```

## 📞 Support

- **Firebase Documentation**: https://firebase.google.com/docs/crashlytics
- **React Native Firebase**: https://rnfirebase.io/crashlytics/usage
- **TestFlight Crash Reports**: https://developer.apple.com/testflight/

---

**Note**: This setup provides comprehensive crash analytics for both TestFlight beta testing and production releases. Crashes will be automatically captured and reported without any user interaction required.