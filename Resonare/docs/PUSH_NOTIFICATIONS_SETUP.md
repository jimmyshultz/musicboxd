# Push Notifications Setup Guide

This guide covers the configuration required for push notifications in Resonare.

## Prerequisites

- Apple Developer Program membership (already active)
- Firebase project configured (already done for Crashlytics)
- Physical iOS device for testing (push notifications don't work on Simulator)

## iOS Configuration Steps

### 1. Enable Push Notifications Capability in Xcode

1. Open `ios/Resonare.xcworkspace` in Xcode
2. Select the **Resonare** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **Push Notifications**
6. Add **Background Modes** and check:
   - Remote notifications

### 2. Create APNs Authentication Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **Keys** → **Create a key**
3. Enter name: `Resonare Push Key`
4. Check **Apple Push Notifications service (APNs)**
5. Click **Continue** → **Register**
6. **Download the .p8 file** (you can only download it once!)
7. Note the **Key ID** shown on the page
8. Note your **Team ID** (found in Membership details)

### 3. Upload APNs Key to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the **Resonare** project
3. Click **Settings** (gear icon) → **Project settings**
4. Go to **Cloud Messaging** tab
5. Under **Apple app configuration**, click **Upload** for APNs Authentication Key
6. Upload the `.p8` file
7. Enter the **Key ID** and **Team ID**
8. Click **Upload**

### 4. Install Dependencies

```bash
cd Resonare
npm install
cd ios && pod install && cd ..
```

## Supabase Setup (Dashboard Method)

### 1. Run Database Migration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Select your project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open `database/migrations/add_push_notification_tables.sql` and copy its entire contents
5. Paste into the SQL Editor and click **Run**
6. Verify success - check **Table Editor** for `push_tokens` and `push_preferences` tables

### 2. Create Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/) → Select **Resonare** project
2. Click **Settings** (gear icon) → **Project settings**
3. Go to **Service accounts** tab
4. Click **Generate new private key**
5. Click **Generate key** to download the JSON file
6. **Keep this file secure** - it contains sensitive credentials

### 3. Add Service Account to Supabase Secrets

1. In Supabase Dashboard, go to **Project Settings** (gear icon, bottom left)
2. Click **Edge Functions** in the left menu
3. Click **Secrets** tab
4. Click **Add new secret**
5. Configure:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste the **entire contents** of the downloaded JSON file
6. Click **Save**

### 4. Deploy Edge Function

**Option A: Via Dashboard** (if available)
1. Go to **Edge Functions** in left sidebar
2. Click **Create a new function**
3. Name it: `send-push`
4. Paste contents of `supabase/functions/send-push/index.ts`
5. Click **Deploy**

**Option B: Via CLI** (one-time)
```bash
cd Resonare
supabase functions deploy send-push
```

### 5. Configure Database Webhook

1. Go to **Database** → **Webhooks** in left sidebar
2. Click **Create a new webhook**
3. Configure:
   - **Name**: `send-push-notification`
   - **Table**: `notifications`
   - **Events**: Check **Insert** only
   - **Type**: `Supabase Edge Functions`
   - **Edge Function**: `send-push`
4. Click **Create webhook**

## Verification

After completing setup:

1. Run the app on a physical iOS device
2. Log in with a test account
3. Check Xcode console for:
   - `✅ APNs token registered with Firebase Messaging`
   - `✅ FCM token received: <token>`
4. Verify the token appears in `push_tokens` table in Supabase

## Troubleshooting

### No FCM token received
- Ensure the `.p8` key is uploaded to Firebase
- Check that Push Notifications capability is enabled in Xcode
- Verify `GoogleService-Info.plist` is up to date

### Push notifications not received
- Push notifications only work on physical devices
- Check the app has notification permissions granted
- Verify the device token is stored in `push_tokens` table

## Production Deployment

When you're ready to deploy push notifications to production, follow these steps on your **production Supabase project**:

### 1. Run Database Migration

1. Go to your **production** Supabase Dashboard
2. Open **SQL Editor** → **New Query**
3. Copy and paste the contents of `database/migrations/add_push_notification_tables.sql`
4. Click **Run**
5. Verify `push_tokens` and `push_preferences` tables exist

### 2. Add Firebase Service Account Secret

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add a new secret:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste the entire Firebase service account JSON (same file used in dev)
3. Click **Save**

### 3. Deploy Edge Function

Use the Supabase CLI targeting your production project:

```bash
supabase login
supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF
supabase functions deploy send-push
```

Or manually via Dashboard if supported.

### 4. Create Database Webhook

1. Go to **Database** → **Webhooks**
2. Create a new webhook:
   - **Name**: `send-push-notification`
   - **Table**: `notifications`
   - **Events**: `INSERT`
   - **Type**: `Supabase Edge Functions`
   - **Edge Function**: `send-push`
3. Click **Create webhook**

### 5. Verify Production Setup

1. Check Edge Function logs in Dashboard for any errors
2. Test with a production build on a physical device
3. Verify tokens are being saved to `push_tokens` table
4. Trigger a notification and confirm push is received

### Checklist Summary

| Step | Action |
|------|--------|
| ☐ | Run database migration on production |
| ☐ | Add `FIREBASE_SERVICE_ACCOUNT` secret |
| ☐ | Deploy `send-push` Edge Function |
| ☐ | Create webhook on `notifications` table |
| ☐ | Test on physical device with production build |
