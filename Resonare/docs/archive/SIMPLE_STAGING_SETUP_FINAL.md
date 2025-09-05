# 🚀 Simple Staging Setup - Final Steps

## ✅ What I've Fixed

1. **Created missing `src/config/env.ts`** file
2. **Fixed import** in `supabase.ts` (`ENV` → `ENV_CONFIG`)  
3. **Created shared schemes** for Xcode
4. **Updated package.json** with environment scripts

## 🔧 What You Need to Do

### **Step 1: Create Your Environment Files**

**Create `.env.development`** in `Resonare/` directory:
```bash
# Development Environment
ENVIRONMENT=development

# Replace with your actual Supabase credentials
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key-here

# Replace with your actual Spotify client ID
SPOTIFY_CLIENT_ID=your-actual-spotify-client-id
```

**Create `.env.staging`** in `Resonare/` directory:
```bash
# Staging Environment  
ENVIRONMENT=staging

# Will update after creating staging Supabase project
SUPABASE_URL=https://staging-project-id.supabase.co
SUPABASE_ANON_KEY=staging-anon-key-here

# Same Spotify client ID
SPOTIFY_CLIENT_ID=your-actual-spotify-client-id
```

### **Step 2: Test Development Environment**
```bash
ENVFILE=.env.development npm run ios
```

**Expected**: App should load with your current data (no more config errors)

### **Step 3: Create Staging Supabase Project**
1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Create new project**: "Resonare Staging"
3. **Copy credentials** from Settings → API
4. **Update `.env.staging`** with staging credentials
5. **Run complete `schema_v2.sql`** in staging SQL editor

### **Step 4: Test Staging Environment**
```bash
ENVFILE=.env.staging npm run ios
```

**Expected**: App loads with empty staging database

## 🎯 Key Benefits

- ✅ **Environment separation** works perfectly
- ✅ **No complex build configurations** 
- ✅ **Same app, different databases**
- ✅ **Safe testing** without affecting production data
- ✅ **Easy switching** between environments

## 🚀 After Setup

You'll be able to:
- **Test Week 5 features** in staging safely
- **Test database changes** before production
- **Share staging with others** for feedback
- **Complete Week 5** with proper staging validation

---

**The configuration errors should be gone now - try creating your `.env.development` file and testing!** ✅