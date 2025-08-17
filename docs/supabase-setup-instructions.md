# Supabase Setup Instructions for Musicboxd

This guide will walk you through setting up the Supabase project and database for the Musicboxd app.

## 📋 Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Access to the Musicboxd React Native codebase

## 🚀 Step 1: Create Supabase Project

1. **Sign up/Login** to Supabase at [supabase.com](https://supabase.com)
2. **Click "New Project"** from your dashboard
3. **Configure your project**:
   - **Organization**: Select or create an organization
   - **Project Name**: `musicboxd-dev` (for development)
   - **Database Password**: Generate a strong password and **save it securely**
   - **Region**: Choose the region closest to your location
   - **Pricing Plan**: Free tier (sufficient for development)

4. **Wait for project creation** (usually takes 2-3 minutes)

## 🔑 Step 2: Get API Keys

Once your project is ready:

1. **Navigate to Settings** → **API** in your Supabase dashboard
2. **Copy the following values**:
   - **Project URL** (e.g., `https://your-project-ref.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)
   - **Service role key** (starts with `eyJ...` - keep this secure!)

## 📝 Step 3: Configure Environment Variables

1. **Open your React Native project** (`/workspace/Musicboxd/`)
2. **Edit the `.env` file** and replace the placeholder values:

```env
# Replace with your actual Supabase values
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here

NODE_ENV=development
```

## 🗄️ Step 4: Set Up Database Schema

1. **Go to your Supabase dashboard**
2. **Navigate to SQL Editor** (in the left sidebar)
3. **Create a new query** and copy the entire contents of `/workspace/database/schema.sql`
4. **Run the query** to create all tables, indexes, and security policies

The schema includes:
- ✅ User profiles table
- ✅ Albums table for Spotify data
- ✅ User-album interactions (ratings, reviews, listening status)
- ✅ User following system
- ✅ Activity feed
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Triggers for automatic timestamps and activity creation

## 🔐 Step 5: Configure OAuth Providers

### Google Sign-In Setup

1. **Go to Authentication** → **Providers** in Supabase dashboard
2. **Enable Google** provider
3. **Create Google OAuth credentials**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
   - Application type: iOS (for React Native)
   - Add your bundle ID (from `ios/Musicboxd/Info.plist`)

4. **Configure in Supabase**:
   - Add Client ID and Client Secret from Google
   - Set redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`

### Apple Sign-In Setup

1. **Enable Apple** provider in Supabase
2. **Configure Apple Developer Account**:
   - Go to [Apple Developer Console](https://developer.apple.com/)
   - Create App ID with Sign In with Apple capability
   - Create Service ID for web authentication
   - Create private key for Apple Sign-In

3. **Configure in Supabase**:
   - Add Service ID, Team ID, Key ID, and Private Key from Apple
   - Set redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`

## 📱 Step 6: Install Dependencies

Run the following in your React Native project:

```bash
cd /workspace/Musicboxd
npm install
```

This will install the newly added Supabase dependencies:
- `@supabase/supabase-js`
- `react-native-url-polyfill`

## 🧪 Step 7: Test the Connection

1. **Start your React Native app**:
   ```bash
   npm run ios  # or npm run android
   ```

2. **Check the console** for any Supabase connection warnings
3. **Verify the connection** by testing the user service functions

## 🔒 Step 8: Security Checklist

- ✅ Database RLS policies are enabled
- ✅ `.env` file is in `.gitignore`
- ✅ Service role key is kept secure (not in client code)
- ✅ OAuth redirect URLs are properly configured
- ✅ Only necessary permissions are granted

## 📊 Step 9: Monitoring & Analytics

1. **Enable real-time subscriptions** in Supabase (if needed)
2. **Set up monitoring** in the Supabase dashboard
3. **Configure usage alerts** to stay within free tier limits

## 🚨 Troubleshooting

### Common Issues:

1. **"Invalid API key" error**:
   - Double-check your `.env` file values
   - Ensure no extra spaces or quotes around values

2. **RLS policy errors**:
   - Verify the database schema was applied correctly
   - Check that user is authenticated before making requests

3. **OAuth not working**:
   - Verify redirect URLs match exactly
   - Check bundle ID configuration for iOS

4. **Connection timeout**:
   - Check your internet connection
   - Verify Supabase project is running (not paused)

## 📈 Next Steps

Once setup is complete, you're ready for **Week 2** of the roadmap:
- ✅ Authentication integration in React Native
- ✅ User profile management screens
- ✅ Redux store updates for auth state

## 💰 Cost Monitoring

The free tier includes:
- 500MB database storage
- 2GB bandwidth per month
- 50,000 monthly active users
- 500,000 Edge Function invocations

Monitor usage in the Supabase dashboard to stay within limits during development.

---

**🎯 Week 1 Deliverable Status**: ✅ Complete
- Supabase project setup ✅
- PostgreSQL database schema ✅
- Row Level Security policies ✅
- OAuth configuration ✅
- Basic API endpoints ✅