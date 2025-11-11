# AdMob Quick Start Guide

## ✅ What's Already Done

The AdMob integration is **fully set up** and ready to use! Here's what's been completed:

1. ✅ Installed `react-native-google-mobile-ads` package
2. ✅ Installed iOS CocoaPods dependencies
3. ✅ Configured iOS (Info.plist)
4. ✅ Configured Android (AndroidManifest.xml)
5. ✅ Created AdMob service with initialization
6. ✅ Initialized AdMob in App.tsx
7. ✅ Created three ad components:
   - `BannerAd.tsx` - Banner ads
   - `InterstitialAd.tsx` - Full-screen ads
   - `RewardedAd.tsx` - Rewarded ads

## 🎯 What You Need to Do

### Step 1: Get Your AdMob App IDs (Required for Production)

Currently using **test IDs**. For production, you need to:

1. **Go to [AdMob Console](https://apps.admob.com/)**
   - Sign in with your Google account
   - Create apps for both iOS and Android

2. **Get Your App IDs** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)

3. **Replace Test IDs in Your Code:**

   **iOS:** Edit `ios/Resonare/Info.plist`:
   ```xml
   <key>GADApplicationIdentifier</key>
   <string>YOUR_REAL_IOS_APP_ID_HERE</string>
   ```
   
   **Android:** Edit `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <meta-data
     android:name="com.google.android.gms.ads.APPLICATION_ID"
     android:value="YOUR_REAL_ANDROID_APP_ID_HERE"/>
   ```

4. **Create Ad Units** in AdMob Console:
   - Banner ad unit
   - Interstitial ad unit (optional)
   - Rewarded ad unit (optional)

5. **Update Ad Unit IDs** in `src/services/adMobService.ts`:
   ```typescript
   banner: Platform.select({
     ios: Environment.isProduction 
       ? 'YOUR_IOS_BANNER_AD_UNIT_ID' // Replace this
       : 'ca-app-pub-3940256099942544/2934735716', // Keep test ID
   ```

### Step 2: Test the Integration

Run your app to test:

```bash
# iOS
npm run ios

# Android
npm run android
```

You should see test banner ads appear!

### Step 3: Use Ads in Your App

**Add a Banner Ad (easiest):**

```tsx
import BannerAdComponent from '../components/BannerAd';

function MyScreen() {
  return (
    <View>
      <Text>My Content</Text>
      <BannerAdComponent /> {/* Add this line */}
    </View>
  );
}
```

**Show Interstitial Ad (full-screen):**

```tsx
import { useInterstitialAd } from '../components/InterstitialAd';

function MyScreen() {
  const { showAd, isLoaded } = useInterstitialAd();
  
  const handleAction = () => {
    if (isLoaded) {
      showAd();
    }
  };
  
  return <Button onPress={handleAction}>Complete</Button>;
}
```

**Show Rewarded Ad (users earn rewards):**

```tsx
import { useRewardedAd } from '../components/RewardedAd';

function MyScreen() {
  const { showAd, isLoaded, reward } = useRewardedAd();
  
  useEffect(() => {
    if (reward) {
      // User watched ad, grant reward!
      console.log('Reward earned:', reward);
    }
  }, [reward]);
  
  return (
    <Button onPress={showAd} disabled={!isLoaded}>
      Watch Ad for Reward
    </Button>
  );
}
```

## 📚 Full Documentation

For complete details, see [ADMOB_SETUP.md](./ADMOB_SETUP.md)

## 🔍 Files Modified/Created

- ✅ `src/services/adMobService.ts` - AdMob configuration & initialization
- ✅ `src/components/BannerAd.tsx` - Banner ad component
- ✅ `src/components/InterstitialAd.tsx` - Interstitial ad hook
- ✅ `src/components/RewardedAd.tsx` - Rewarded ad hook
- ✅ `App.tsx` - Added AdMob initialization
- ✅ `ios/Resonare/Info.plist` - Added AdMob App ID
- ✅ `android/app/src/main/AndroidManifest.xml` - Added AdMob App ID
- ✅ `package.json` - Added react-native-google-mobile-ads
- ✅ `ADMOB_SETUP.md` - Complete documentation
- ✅ `ADMOB_QUICK_START.md` - This file

## ⚠️ Important Notes

1. **Test IDs are currently active** - The app will show test ads until you replace with real IDs
2. **Don't click your own ads** - This violates AdMob policies
3. **New AdMob accounts** - Can take 24-48 hours to serve real ads
4. **Production ready** - Just need to add your real AdMob IDs for production

## 🚀 Next Steps

1. Test the integration with test ads (already working!)
2. Create your AdMob account and get App IDs
3. Replace test IDs with real IDs when ready for production
4. Start adding ads to your screens

That's it! Your app is now AdMob-ready! 🎉

