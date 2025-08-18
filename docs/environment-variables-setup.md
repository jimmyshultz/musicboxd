# Environment Variables Setup for React Native

## ✅ **What We've Configured**

I've set up proper environment variable support for your React Native app using `react-native-config`. Here's what's been done:

### **1. Dependencies Added**
- ✅ `react-native-config@^1.5.1` added to package.json
- ✅ TypeScript types created for config

### **2. Code Updated**
- ✅ `/src/services/supabase.ts` now uses `Config.SUPABASE_URL` and `Config.SUPABASE_ANON_KEY`
- ✅ Proper error handling for missing environment variables

### **3. Your .env File**
Your `.env` file should contain:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here
NODE_ENV=development
```

## 🚀 **Steps to Complete Setup**

### **Step 1: Install CocoaPods Dependencies**
Run this on your local machine (where you have CocoaPods installed):

```bash
cd /workspace/Musicboxd/ios
pod install
cd ..
```

### **Step 2: Update Your .env File**
Make sure your `/workspace/Musicboxd/.env` file has your actual Supabase credentials:

```env
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_actual_key_here
NODE_ENV=development
```

### **Step 3: Clean and Rebuild**
After updating the .env file:

```bash
# Clean React Native cache
npx react-native start --reset-cache

# For iOS
npm run ios

# For Android (if needed)
npm run android
```

## 🔧 **How It Works Now**

Your Supabase service (`/src/services/supabase.ts`) now:

```typescript
import Config from 'react-native-config';

// Environment variables from .env file
const supabaseUrl = Config.SUPABASE_URL;
const supabaseAnonKey = Config.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️  Supabase configuration not found. Please check your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // ... config
});
```

## 🚨 **Troubleshooting**

### **If you get "Config is undefined" error:**
1. Make sure you ran `pod install` in the iOS directory
2. Clean and rebuild the app
3. Verify your .env file is in the project root (`/workspace/Musicboxd/.env`)

### **If environment variables are still undefined:**
1. Check that your .env file has no spaces around the `=` signs
2. Ensure no quotes around the values
3. Restart the Metro bundler with `--reset-cache`

### **For iOS Simulator:**
After changing .env values, you may need to:
1. Stop the Metro bundler
2. Clean the build: `npx react-native start --reset-cache`
3. Rebuild the app

## ✅ **Verification**

Once set up correctly, you should see no warnings in the console about missing Supabase configuration, and your app should connect to Supabase successfully.

The error `invalid url: your_supabase_project_url_here/` should be resolved once you:
1. Update your .env file with real values
2. Run `pod install` (if on iOS)
3. Restart the app with cache reset