# 🔐 Production Authentication Setup

## Current Issue

You're getting authentication errors when testing the production environment:
- Apple Sign-In: API key error
- Google Sign-In: Also failing

## Root Cause

**Production environment requires separate authentication configuration** from development. Your production Supabase project needs its own auth provider setup.

## 🍎 Apple Sign-In Production Setup

### Step 1: Get Apple Developer Credentials

1. **Go to**: [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. **Find your app**: Look for your Bundle ID (`com.jimmyshultz.resonare` or similar)
3. **Get Team ID**:
   - Go to Membership section
   - Copy your Team ID (10-character string)

### Step 2: Create Apple Sign-In Key

1. **Go to**: [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list)
2. **Click**: "+" to create new key
3. **Name**: "Resonare Production Apple Sign-In"
4. **Enable**: "Sign in with Apple"
5. **Configure**: Select your app's Bundle ID
6. **Download**: The .p8 key file (save it safely!)
7. **Note the Key ID**: You'll need this 10-character ID

### Step 3: Configure Production Supabase

1. **Go to**: Your production Supabase project dashboard
2. **Navigate to**: Authentication → Providers
3. **Find Apple provider** and click configure
4. **Fill in**:
   - **Enable Apple provider**: ✅ ON
   - **Client ID**: Your Bundle ID (e.g., `com.jimmyshultz.resonare`)
   - **Team ID**: From Step 1 (10 characters)
   - **Key ID**: From Step 2 (10 characters)
   - **Private Key**: Open the .p8 file and copy ALL content (including headers)

## 🔍 Google Sign-In Production Setup

### Step 1: Get Google Credentials

1. **Go to**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Select**: Your project (or create new one for production)
3. **Enable**: Google Sign-In API
4. **Create credentials**: OAuth 2.0 Client ID for iOS
5. **Bundle ID**: Use your production Bundle ID

### Step 2: Configure Production Supabase

1. **In production Supabase**: Authentication → Providers
2. **Find Google provider** and configure:
   - **Enable Google provider**: ✅ ON
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console

## 🧪 Testing Production Authentication

### Step 1: Verify Environment

Make sure you're running production:
```bash
ENVFILE=.env.production npm run ios
```

### Step 2: Check Console Logs

Look for:
```
🔧 Current Environment: production
[Production] Using production Supabase configuration
```

### Step 3: Test Authentication

1. **Try Apple Sign-In**: Should work without API key errors
2. **Try Google Sign-In**: Should authenticate properly
3. **Check Supabase**: Verify users are created in production database

## 🔍 Common Issues

### Apple Sign-In "API Key" Error
- **Cause**: Missing or incorrect Apple authentication configuration
- **Fix**: Complete Apple Sign-In production setup above

### Google Sign-In Fails Silently
- **Cause**: Wrong Client ID or missing configuration
- **Fix**: Verify Google OAuth credentials for production

### App Uses Development Database
- **Cause**: Not using production environment
- **Fix**: Ensure `ENVFILE=.env.production` and check console logs

## 🎯 Quick Checklist

- [ ] Production Supabase project created
- [ ] Apple Sign-In configured with Team ID, Key ID, and Private Key
- [ ] Google Sign-In configured with production OAuth credentials
- [ ] App running with `ENVFILE=.env.production`
- [ ] Console shows "production" environment

## 🆘 Need Help?

If you're still having issues:
1. **Share the exact error messages** you're seeing
2. **Confirm which step** you're stuck on
3. **Check the console logs** for authentication details

The production authentication setup is more complex but necessary for a proper production deployment! 🚀