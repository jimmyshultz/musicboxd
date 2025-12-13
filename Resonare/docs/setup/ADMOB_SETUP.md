# AdMob Integration Guide

This guide explains how to use Google AdMob in the Resonare app for displaying advertisements.

**Status**: ✅ **Production Ready** - AdMob is integrated and active in production builds.

## Table of Contents
- [Overview](#overview)
- [Setup Completed](#setup-completed)
- [Getting Your AdMob App IDs](#getting-your-admob-app-ids)
- [Configuration](#configuration)
- [Usage](#usage)
- [Ad Types](#ad-types)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Google AdMob is integrated into the Resonare app using the `react-native-google-mobile-ads` library. The integration supports three types of ads:
- **Banner Ads** - Small rectangular ads that appear at the top or bottom of screens
- **Interstitial Ads** - Full-screen ads that appear at natural breaks in your app flow
- **Rewarded Ads** - Full-screen ads that users can watch to earn in-app rewards

## Setup Completed

The following setup has already been completed:

✅ **Package Installation**
- Installed `react-native-google-mobile-ads` npm package
- iOS CocoaPods dependencies installed

✅ **iOS Configuration**
- Added `GADApplicationIdentifier` to `ios/Resonare/Info.plist`
- Added SKAdNetwork identifiers for ad attribution

✅ **Android Configuration**
- Added AdMob App ID metadata to `android/app/src/main/AndroidManifest.xml`

✅ **App Initialization**
- AdMob SDK is initialized in `App.tsx` on app startup
- Configuration service created at `src/services/adMobService.ts`

✅ **Ad Components Created**
- `src/components/BannerAd.tsx` - Banner ad component
- `src/components/InterstitialAd.tsx` - Interstitial ad hook
- `src/components/RewardedAd.tsx` - Rewarded ad hook

## Getting Your AdMob App IDs

### 1. Create AdMob Account
1. Go to [AdMob Console](https://apps.admob.com/)
2. Sign in with your Google account
3. Accept the terms and conditions

### 2. Create Apps
1. Click **Apps** in the sidebar
2. Click **ADD APP**
3. Select **iOS** and create an app
   - If published: Enter App Store URL
   - If not published: Enter app name manually
4. Repeat for **Android**
5. Save both App IDs (format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)

### 3. Create Ad Units
For each app (iOS and Android), create ad units:

1. Click on your app
2. Click **Ad units** > **GET STARTED**
3. Select ad format:
   - **Banner** - For persistent bottom/top ads
   - **Interstitial** - For full-screen ads between content
   - **Rewarded** - For reward-based full-screen ads
4. Save the Ad Unit IDs for each format

## Configuration

### Update App IDs

#### iOS App ID
Edit `ios/Resonare/Info.plist`:

```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-YOUR_IOS_APP_ID</string>
```

Replace `ca-app-pub-3940256099942544~1458002511` with your real iOS App ID.

#### Android App ID
Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-YOUR_ANDROID_APP_ID"/>
```

Replace `ca-app-pub-3940256099942544~3347511713` with your real Android App ID.

### Update Ad Unit IDs

Edit `src/services/adMobService.ts`:

```typescript
export const AdUnitIds = {
  banner: Platform.select({
    ios: Environment.isProduction 
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // Your real iOS banner ad unit ID
      : 'ca-app-pub-3940256099942544/2934735716', // Test ID (keep this)
    android: Environment.isProduction
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // Your real Android banner ad unit ID
      : 'ca-app-pub-3940256099942544/6300978111', // Test ID (keep this)
  }),
  // ... similar for interstitial and rewarded
};
```

Replace the production IDs with your real Ad Unit IDs from AdMob Console.

## Usage

### Banner Ads

Banner ads are simple to add to any screen:

```tsx
import BannerAdComponent from '../components/BannerAd';
import { BannerAdSize } from 'react-native-google-mobile-ads';

function MyScreen() {
  return (
    <View>
      <Text>My Content</Text>
      
      {/* Basic banner ad */}
      <BannerAdComponent />
      
      {/* Medium rectangle banner */}
      <BannerAdComponent size={BannerAdSize.MEDIUM_RECTANGLE} />
    </View>
  );
}
```

Available banner sizes:
- `BannerAdSize.BANNER` - 320x50 (default)
- `BannerAdSize.FULL_BANNER` - 468x60
- `BannerAdSize.LARGE_BANNER` - 320x100
- `BannerAdSize.MEDIUM_RECTANGLE` - 300x250
- `BannerAdSize.LEADERBOARD` - 728x90

### Interstitial Ads

Interstitial ads are full-screen ads shown at natural breaks:

```tsx
import { useInterstitialAd } from '../components/InterstitialAd';

function MyScreen() {
  const { showAd, isLoaded } = useInterstitialAd();

  const handleLevelComplete = () => {
    // Show ad at natural break point
    if (isLoaded) {
      showAd();
    }
    navigateToNextLevel();
  };

  return (
    <Button onPress={handleLevelComplete}>
      Complete Level
    </Button>
  );
}
```

### Rewarded Ads

Rewarded ads let users earn rewards by watching:

```tsx
import { useRewardedAd } from '../components/RewardedAd';
import { useEffect } from 'react';

function MyScreen() {
  const { showAd, isLoaded, reward } = useRewardedAd();

  // Handle reward when user completes ad
  useEffect(() => {
    if (reward) {
      console.log('User earned:', reward.amount, reward.type);
      // Grant reward to user (e.g., coins, lives, premium content)
      grantUserReward(reward);
    }
  }, [reward]);

  const handleWatchAd = () => {
    if (isLoaded) {
      showAd();
    } else {
      Alert.alert('Ad not ready', 'Please try again in a moment');
    }
  };

  return (
    <Button onPress={handleWatchAd} disabled={!isLoaded}>
      Watch Ad for 100 Coins
    </Button>
  );
}
```

## Ad Types

### Banner Ads
**When to use:**
- Persistent visibility throughout screen usage
- Non-intrusive monetization
- Content-heavy screens

**Best placement:**
- Bottom of screen (most common)
- Top of screen (below navigation)
- Between content sections

### Interstitial Ads
**When to use:**
- Between levels in games
- After completing an action
- During natural pauses in app flow

**Avoid:**
- During active user interaction
- Too frequently (causes poor UX)
- Before critical actions

**Recommended frequency:** Once every 3-5 minutes or major actions

### Rewarded Ads
**When to use:**
- Optional rewards for users
- Premium feature access
- In-game currency/items

**Best practices:**
- Make it optional (never force)
- Clear value proposition
- Consistent reward amount

## Testing

### Test Ad Units

The app automatically uses test ad units in development mode. Test IDs are already configured in `src/services/adMobService.ts`.

**iOS Test IDs:**
- Banner: `ca-app-pub-3940256099942544/2934735716`
- Interstitial: `ca-app-pub-3940256099942544/4411468910`
- Rewarded: `ca-app-pub-3940256099942544/1712485313`

**Android Test IDs:**
- Banner: `ca-app-pub-3940256099942544/6300978111`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`
- Rewarded: `ca-app-pub-3940256099942544/5224354917`

### Testing on Real Devices

To test with real ads on your device without violating AdMob policies:

1. Get your device's advertising ID:
   - **iOS:** Settings > Privacy > Apple Advertising > View Advertising ID
   - **Android:** Settings > Google > Ads > View Advertising ID

2. Add device as test device in `src/services/adMobService.ts`:

```typescript
await mobileAds().setRequestConfiguration({
  testDeviceIdentifiers: [
    'YOUR_DEVICE_ID_HERE',
    'ANOTHER_DEVICE_ID',
  ],
});
```

### Verification

Check AdMob initialization in logs:
```
✅ AdMob initialized successfully
Banner ad loaded
Interstitial ad loaded
Rewarded ad loaded
```

## Best Practices

### 1. Ad Frequency
- **Banner ads:** One per screen is sufficient
- **Interstitial ads:** Maximum once every 3-5 minutes
- **Rewarded ads:** Let user initiate, don't spam prompts

### 2. User Experience
- Never show ads during critical user actions
- Provide clear exit options
- Don't surprise users with unexpected ads
- Respect user choices (e.g., if they dismiss, wait before showing again)

### 3. Ad Placement
- **Banner:** Bottom of screen (doesn't interfere with navigation)
- **Interstitial:** Natural breaks (level completion, navigation, etc.)
- **Rewarded:** Clear opt-in with visible reward value

### 4. Performance
- Preload interstitial and rewarded ads before showing
- Don't block app functionality while ads load
- Handle ad load failures gracefully

### 5. Policy Compliance
- Never encourage accidental clicks
- Don't place ads too close to interactive elements
- Follow Google AdMob Program Policies
- Don't click your own ads

### 6. Revenue Optimization
- Use rewarded ads for engaged users
- A/B test ad placements
- Monitor fill rates and eCPM
- Enable mediation for better fill rates

## Troubleshooting

### Ads Not Showing

**Problem:** Ads don't appear on screen

**Solutions:**
1. Check if AdMob is initialized:
   ```typescript
   import { isAdMobInitialized } from './src/services/adMobService';
   const initialized = await isAdMobInitialized();
   ```

2. Verify App IDs are correct in Info.plist and AndroidManifest.xml

3. Check logs for error messages:
   - iOS: Xcode console
   - Android: `adb logcat | grep Ads`

4. Ensure you're using test IDs during development

5. Wait for ad to load (can take a few seconds)

### "Ad failed to load" Error

**Problem:** Console shows "Ad failed to load"

**Solutions:**
1. **Network issue:** Check internet connection
2. **Ad inventory:** No ads available (common in testing)
3. **App not verified:** New apps take 24-48 hours to serve real ads
4. **Configuration:** Verify App ID and Ad Unit IDs match AdMob console

### iOS Build Errors

**Problem:** Build fails after adding AdMob

**Solutions:**
1. Clean and reinstall pods:
   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   ```

2. Clean Xcode build folder:
   - Xcode: Product > Clean Build Folder (Cmd+Shift+K)

3. Check Info.plist syntax is valid XML

### Android Build Errors

**Problem:** Android build fails

**Solutions:**
1. Clean gradle cache:
   ```bash
   cd android
   ./gradlew clean
   ```

2. Verify AndroidManifest.xml syntax

3. Check for duplicate meta-data tags

### Ads Show in Development but Not Production

**Problem:** Test ads work but real ads don't show

**Solutions:**
1. Replace test IDs with real Ad Unit IDs
2. Replace test App IDs with real App IDs
3. Wait 24-48 hours after creating new ad units
4. Verify app is approved in AdMob console
5. Check ad request quotas aren't exceeded

### Revenue Not Tracking

**Problem:** Ads show but no revenue in AdMob console

**Solutions:**
1. Wait 24-48 hours for data to appear
2. Verify using production ad units (not test IDs)
3. Don't click your own ads (policy violation)
4. Check if app is approved for monetization

## Additional Resources

- [AdMob Console](https://apps.admob.com/)
- [react-native-google-mobile-ads Documentation](https://docs.page/invertase/react-native-google-mobile-ads)
- [AdMob Policy Center](https://support.google.com/admob/answer/6128543)
- [AdMob Best Practices](https://support.google.com/admob/answer/6128877)

## Support

For issues specific to this integration:
1. Check this documentation first
2. Review console logs for errors
3. Verify configuration in AdMob console
4. Test with official test IDs

For AdMob-specific issues:
- [AdMob Help Center](https://support.google.com/admob)
- [AdMob Community Forum](https://groups.google.com/g/google-admob-ads-sdk)

