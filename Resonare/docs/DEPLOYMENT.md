# Deployment Guide

This guide covers the deployment process for Resonare, including building for production, App Store submission, and release management.

**Status**: ✅ **Production** - App is live on Apple App Store

---

## Prerequisites

### Required Accounts
- Apple Developer Program membership ($99/year)
- App Store Connect access
- Supabase account with production project
- Firebase account for Crashlytics
- AdMob account for monetization
- Spotify Developer account

### Required Tools
- Xcode (latest version)
- CocoaPods
- Node.js >= 18
- Git

---

## Environment Configuration

### Environment Files

The app uses three environment configurations:

1. **Development** (`.env.development`)
   - Local development
   - Full logging enabled
   - Test ad units

2. **Staging** (`.env.staging`)
   - Pre-production testing
   - Limited logging
   - Test ad units
   - Staging Supabase project

3. **Production** (`.env.production`)
   - App Store builds
   - Logging suppressed
   - Production ad units
   - Production Supabase project

### Environment Variables

Required variables (see `.env.production.example`):

```bash
# Supabase
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_supabase_anon_key

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Environment
ENVIRONMENT=production
```

**Important**: Never commit `.env.production` to version control. Use `.env.production.example` as a template.

---

## iOS Build Process

### 1. Update Version Numbers

Update version in:
- `package.json` - App version
- `ios/Resonare/Info.plist` - `CFBundleShortVersionString` and `CFBundleVersion`
- `app.json` - Display name and version

### 2. Configure Production Environment

1. Copy production environment template:
   ```bash
   cp .env.production.example .env.production
   ```

2. Fill in production credentials:
   - Supabase production URL and keys
   - Spotify API credentials
   - Set `ENVIRONMENT=production`

3. Verify environment configuration:
   ```bash
   # Check environment is set correctly
   cat .env.production | grep ENVIRONMENT
   ```

### 3. Update AdMob Configuration

1. Update `ios/Resonare/Info.plist`:
   ```xml
   <key>GADApplicationIdentifier</key>
   <string>ca-app-pub-YOUR_PRODUCTION_IOS_APP_ID</string>
   ```

2. Update `src/services/adMobService.ts` with production ad unit IDs:
   ```typescript
   banner: Platform.select({
     ios: Environment.isProduction 
       ? 'ca-app-pub-YOUR_PRODUCTION_BANNER_ID'
       : 'ca-app-pub-3940256099942544/2934735716', // Test ID
   }),
   ```

### 4. Update Firebase Configuration

1. Ensure `GoogleService-Info.plist` is in `ios/Resonare/`
2. Verify Firebase project is configured for production
3. Check Crashlytics is enabled in Firebase Console

### 5. Build for Production

1. Clean build folder:
   ```bash
   cd ios
   xcodebuild clean
   cd ..
   ```

2. Install/update pods:
   ```bash
   cd ios && pod install && cd ..
   ```

3. Build archive in Xcode:
   - Open `ios/Resonare.xcworkspace` in Xcode
   - Select "Any iOS Device" as target
   - Product > Archive
   - Wait for archive to complete

### 6. Validate Archive

1. In Xcode Organizer, select the archive
2. Click "Validate App"
3. Fix any validation errors
4. Ensure no warnings that could cause App Store rejection

---

## App Store Submission

### 1. Prepare App Store Connect

1. Log in to [App Store Connect](https://appstoreconnect.apple.com/)
2. Select your app
3. Prepare app information:
   - App description
   - Screenshots (required sizes)
   - App icon
   - Privacy policy URL
   - Support URL

### 2. Upload Build

1. In Xcode Organizer, select archive
2. Click "Distribute App"
3. Select "App Store Connect"
4. Choose distribution options:
   - Upload
   - Include bitcode (if applicable)
   - Strip Swift symbols (if applicable)
5. Select distribution certificate and provisioning profile
6. Upload build

### 3. Submit for Review

1. In App Store Connect, go to your app version
2. Select the uploaded build
3. Complete all required information:
   - Export compliance
   - Content rights
   - Advertising identifier usage
4. Submit for review

### 4. Post-Submission

- Monitor App Store Connect for review status
- Respond to any review feedback
- Prepare for release (automatic or manual)

---

## Release Management

### Version Numbering

Follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Checklist

Before each release:

- [ ] Update version numbers in all files
- [ ] Update CHANGELOG.md (if maintained)
- [ ] Test on physical device
- [ ] Verify all production credentials
- [ ] Check AdMob ad units are production
- [ ] Verify Firebase Crashlytics is active
- [ ] Test authentication flows
- [ ] Test core features (search, rate, follow)
- [ ] Verify content moderation is working
- [ ] Check error boundaries are in place
- [ ] Review crash reports from previous version
- [ ] Update documentation if needed

### Hotfix Process

For critical bug fixes:

1. Create hotfix branch from production tag
2. Fix the issue
3. Increment patch version
4. Test thoroughly
5. Build and submit expedited review (if needed)
6. Merge back to main branch

---

## Android Deployment

### Prerequisites

- Android Studio (for debugging and emulator)
- JDK 17 or higher
- Android SDK (API 35 for latest features)
- Google Play Developer account ($25 one-time fee) - for Play Store distribution

### Android Build Process

#### 1. Update Version Numbers

Update version in:
- `package.json` - App version
- `android/app/build.gradle` - `versionCode` and `versionName`

```groovy
defaultConfig {
    versionCode 2      // Increment for each release
    versionName "1.1"  // User-visible version
}
```

#### 2. Generate Release Keystore (First Time Only)

```bash
cd android/app/keystore
keytool -genkey -v -keystore release.keystore -alias resonare-key -keyalg RSA -keysize 2048 -validity 10000
```

**Important**: Store the keystore and passwords securely. You'll need them for every future release.

#### 3. Configure Release Signing

Create `android/keystore.properties` (from template):
```bash
cp android/keystore.properties.example android/keystore.properties
# Edit with your actual passwords
```

Or set environment variables:
```bash
export ANDROID_KEYSTORE_PASSWORD=your_keystore_password
export ANDROID_KEY_PASSWORD=your_key_password
```

#### 4. Build Release APK

```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

#### 5. Build Release Bundle (for Play Store)

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Google Play Console Setup

#### 1. Create App

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Create app**
3. Fill in:
   - **App name**: Resonare
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
4. Accept Developer Program Policies and US export laws
5. Click **Create app**

#### 2. Store Listing

Navigate to **Main store listing** and complete:

| Section | What to provide |
|---------|-----------------|
| **App name** | Resonare (max 30 characters) |
| **Short description** | Brief compelling description (max 80 characters) |
| **Full description** | Detailed app description (max 4000 characters) |
| **App icon** | 512x512 PNG (32-bit, alpha) |
| **Feature graphic** | 1024x500 PNG or JPEG |
| **Phone screenshots** | Min 2, max 8 (16:9 or 9:16 aspect ratio) |
| **Tablet screenshots** | Optional but recommended |

#### 3. Content Rating

1. Go to **Policy** → **App content** → **Content rating**
2. Click **Start questionnaire**
3. Select category: **Utility, Productivity, Communication, or other**
4. Answer questions honestly about:
   - Violence and fear
   - Sexuality
   - Language
   - Controlled substances
   - **Ads**: Yes (you have AdMob)
   - User interaction features
5. Submit questionnaire
6. Review and apply the rating

#### 4. App Content Declarations

Complete all sections under **Policy** → **App content**:

- **Privacy policy**: Add your privacy policy URL (required)
- **Ads**: Declare that your app contains ads
- **App access**: Provide test account if app requires login
- **Data safety**: Complete the form about data collection:
  - Account info (email, name)
  - Device identifiers
  - App activity
  - Analytics data
- **Government apps**: Not applicable
- **Financial features**: Not applicable (unless you add subscriptions)

#### 5. App Signing

1. Go to **Release** → **Setup** → **App signing**
2. Enable **Google Play App Signing** (recommended)
3. Upload your upload key (the release keystore you generated)
4. Google will manage the actual signing key

#### 6. Create a Release

##### Internal Testing (Recommended First)

1. Go to **Release** → **Testing** → **Internal testing**
2. Click **Create new release**
3. Upload your `app-release.aab` file
4. Add release notes describing what's new
5. Click **Review release** → **Start rollout to Internal testing**
6. Add testers:
   - Go to **Testers** tab
   - Create an email list
   - Add up to 100 testers
   - Share the opt-in link with testers

##### Production Release

1. Go to **Release** → **Production**
2. Click **Create new release**
3. Upload your `app-release.aab` file
4. Add release notes
5. Click **Review release**
6. Fix any errors or warnings
7. Click **Start rollout to Production**

#### 7. Review Timeline

| Release Type | Typical Review Time |
|--------------|---------------------|
| First submission | 3-7 days |
| Updates | Few hours to 1-2 days |
| Expedited review | Request via Play Console if critical |

### Debug Build

For development testing:
```bash
cd Resonare
npm run android
```

Or specific environment:
```bash
npm run android:dev
```


---

## Monitoring & Maintenance

### Crash Monitoring

- Monitor Firebase Crashlytics dashboard daily
- Set up alerts for new crash types
- Prioritize fixes based on user impact
- Track crash-free user percentage

### Performance Monitoring

- Monitor API response times
- Track app performance metrics
- Review user feedback and ratings
- Analyze feature usage

### AdMob Monitoring

- Monitor ad fill rates
- Track revenue metrics
- Optimize ad placement based on data
- Ensure compliance with AdMob policies

---

## Rollback Procedure

If a critical issue is discovered after release:

1. **Immediate Actions**:
   - Document the issue
   - Assess user impact
   - Determine if hotfix is needed

2. **If Rollback Needed**:
   - Prepare previous stable version
   - Submit expedited review request to Apple
   - Communicate with users if necessary

3. **Post-Rollback**:
   - Fix the issue in development
   - Test thoroughly
   - Submit fixed version

---

## Security Considerations

### Secrets Management

- Never commit `.env.production` to version control
- Use secure storage for API keys
- Rotate credentials periodically
- Limit access to production credentials

### Code Signing

- Keep distribution certificates secure
- Use App Store Connect API for automated signing when possible
- Document certificate expiration dates

### Database Security

- Use Row Level Security (RLS) policies
- Regularly review database permissions
- Monitor for suspicious activity
- Keep Supabase project secure

---

## Troubleshooting

### Common Build Issues

**Issue**: Build fails with CocoaPods errors
- **Solution**: Clean pods and reinstall
  ```bash
  cd ios
  rm -rf Pods Podfile.lock
  pod install
  cd ..
  ```

**Issue**: Environment variables not loading
- **Solution**: Verify `.env.production` exists and `ENVFILE` is set correctly

**Issue**: AdMob not showing ads
- **Solution**: Verify production ad unit IDs are correct and account is approved

### App Store Rejection

Common rejection reasons:
- Missing privacy policy URL
- Incomplete app information
- Guideline violations
- Technical issues

**Response Process**:
1. Review rejection reason carefully
2. Fix the issue
3. Resubmit with explanation
4. Request expedited review if needed

---

## Resources

- [Apple App Store Connect](https://appstoreconnect.apple.com/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Supabase Documentation](https://supabase.com/docs)
- [Firebase Crashlytics](https://firebase.google.com/docs/crashlytics)
- [AdMob Documentation](https://developers.google.com/admob)

---

## Support

For deployment issues:
1. Check this documentation
2. Review error logs
3. Check App Store Connect status
4. Consult Apple Developer support if needed

---

**Last Updated**: Post-Launch Documentation Review
