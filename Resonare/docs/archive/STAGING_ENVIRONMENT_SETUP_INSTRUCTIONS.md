# 🚀 Staging Environment Setup Instructions

## Files Created for You

I've created these example files in your repo:
- ✅ `.env.development.example` 
- ✅ `.env.staging.example`
- ✅ `.env.production.example`
- ✅ `src/config/env.example.ts`
- ✅ `android/app/build.gradle.example`
- ✅ `android/app/src/main/res/values/strings.xml.example`
- ✅ Updated `package.json` with environment scripts

## Step-by-Step Setup Instructions

### **Step 1: Create Your Environment Files**

Copy the example files and fill in your actual credentials:

```bash
cd Resonare

# Copy examples to actual files
cp .env.development.example .env.development
cp .env.staging.example .env.staging  
cp .env.production.example .env.production
```

**Edit each file with your actual credentials:**
- Replace `your-dev-project-id` with your current Supabase project ID
- Replace `your_dev_anon_key_here` with your current Supabase anon key
- Replace `your_spotify_client_id_here` with your Spotify client ID
- For `.env.staging` - you'll add staging credentials in Step 6

---

### **Step 2: Update Your Environment Configuration**

**Option A: If you already have an env/config file:**
- Update it to use `react-native-config` like the example in `src/config/env.example.ts`

**Option B: If you don't have one:**
- Copy `src/config/env.example.ts` to your actual config location
- Import and use it in your Supabase client setup

---

### **Step 3: Update Supabase Client**

Update your Supabase client initialization to use the new config:

```typescript
// In your supabase client file
import { createClient } from '@supabase/supabase-js';
import { ENV } from './config/env'; // adjust path as needed

const supabase = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY
);

export { supabase };
```

---

### **Step 4: iOS Configuration (Xcode)**

**4a. Install Pods (if needed):**
```bash
cd ios && pod install && cd ..
```

**4b. Open Xcode:**
```bash
cd ios
open Resonare.xcworkspace
```

**4c. Create Schemes:**
1. **Product → Scheme → Manage Schemes**
2. **Click "+"** to add new scheme
3. **Duplicate existing scheme** → name it **"Resonare-Development"**
4. **Duplicate again** → name it **"Resonare-Staging"**

**4d. Create Build Configurations:**
1. **Project Settings → Info → Configurations**
2. **Duplicate "Debug"** → name it **"Debug-Development"**
3. **Duplicate "Debug"** → name it **"Debug-Staging"**
4. **Duplicate "Release"** → name it **"Release-Development"**
5. **Duplicate "Release"** → name it **"Release-Staging"**

**4e. Assign Configurations:**
1. **Product → Scheme → Edit Scheme** for "Resonare-Development"
   - **Run**: Use "Debug-Development"
   - **Archive**: Use "Release-Development"
2. **Product → Scheme → Edit Scheme** for "Resonare-Staging"
   - **Run**: Use "Debug-Staging"  
   - **Archive**: Use "Release-Staging"

---

### **Step 5: Android Configuration**

**5a. Update build.gradle:**
- Open `android/app/build.gradle`
- Find the `buildTypes` section
- Replace it with the configuration from `android/app/build.gradle.example`

**5b. Update strings.xml:**
- Open `android/app/src/main/res/values/strings.xml`
- Update it to match `android/app/src/main/res/values/strings.xml.example`

---

### **Step 6: Create Staging Supabase Project**

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Click "New Project"**
3. **Fill in:**
   - **Name**: `Resonare Staging`
   - **Password**: Strong password (save it!)
   - **Region**: Same as production
4. **Wait for provisioning** (2-3 minutes)
5. **Copy credentials** from **Settings → API**:
   - Project URL  
   - Anon key
6. **Update `.env.staging`** with these credentials

---

### **Step 7: Set Up Staging Database**

1. **Go to staging project → SQL Editor**
2. **Copy entire contents** of `/workspace/database/schema_v2.sql` 
3. **Paste and execute** in staging SQL editor
4. **Verify** all tables created successfully

---

### **Step 8: Test the Setup**

**8a. Test Development Environment:**
```bash
npm run ios:dev
# or
npm run android:dev
```

**8b. Test Staging Environment:**
```bash
npm run ios:staging
# or  
npm run android:staging
```

**8c. Verify Results:**
- Different app names should appear ("Resonare Dev" vs "Resonare Staging")
- Both apps can be installed side-by-side
- Each connects to different Supabase projects
- Create test accounts to verify database separation

---

### **Step 9: Update .gitignore**

Add these lines to your `.gitignore`:
```bash
# Environment files (keep examples, ignore actual files)
.env.development
.env.staging
.env.production
```

---

## 🎯 Expected Results

After completing setup:

- **✅ Three separate app builds** with different bundle IDs
- **✅ Automatic environment switching** via build commands
- **✅ Side-by-side installation** capability
- **✅ Safe deployment** process
- **✅ Professional development workflow**

## 🚨 Important Notes

1. **React Native Config is already installed** - I can see it in your package.json
2. **Scripts are already updated** - Your package.json now has the environment commands
3. **Keep example files** - They serve as documentation for your team
4. **Test thoroughly** - Verify each environment works before proceeding

## 🎉 After Setup

Once complete, you'll have a professional staging environment ready for:
- Testing new features safely
- Database schema migrations  
- Team collaboration
- CI/CD pipeline integration

**This prepares you perfectly for Week 6 development!** 🚀