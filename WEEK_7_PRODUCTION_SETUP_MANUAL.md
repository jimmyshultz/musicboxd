# Week 7: Production Setup & TestFlight - Manual Instructions

> **Goal**: Set up production environment and prepare for beta testing via TestFlight

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] Apple Developer Account ($99/year) - **REQUIRED FOR WEEK 7**
- [ ] Current development environment working
- [ ] Access to your existing development Supabase project
- [ ] Spotify API credentials

---

## 🗂 Phase 1: Apple Developer Program Setup

### Step 1.1: Enroll in Apple Developer Program
**⏰ Time Required**: 24-48 hours for approval

1. **Visit**: https://developer.apple.com/programs/enroll/
2. **Sign in** with your Apple ID (use the same one you want for App Store)
3. **Choose enrollment type**: Individual ($99/year)
4. **Complete enrollment** and payment
5. **Wait for approval** (usually 24-48 hours)

**⚠️ CRITICAL**: Do NOT proceed with other steps until Apple Developer enrollment is approved.

### Step 1.2: Configure App Store Connect
**⏰ After Apple Developer approval**

1. **Visit**: https://appstoreconnect.apple.com/
2. **Sign in** with your Apple Developer account
3. **Create new app**:
   - **Platform**: iOS
   - **Name**: `Musicboxd` (or your preferred name)
   - **Primary Language**: English (US)
   - **Bundle ID**: `com.musicboxd.app` (must match your Xcode project)
   - **SKU**: `musicboxd-ios-app`
4. **Save** and note your App Store Connect app information

---

## 🗄 Phase 2: Production Supabase Environment

### Step 2.1: Create Production Supabase Project
**⏰ Time Required**: 15 minutes

1. **Visit**: https://supabase.com/dashboard
2. **Create new project**:
   - **Organization**: Your organization
   - **Name**: `musicboxd-production`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your target users
3. **Wait** for project creation (2-3 minutes)

### Step 2.2: Configure Production Database
**⏰ Time Required**: 10 minutes

1. **Open SQL Editor** in your new production project
2. **Copy** the complete `schema_v2.sql` from `/workspace/database/schema_v2.sql`
3. **Run** the entire schema in production SQL editor
4. **Verify** all tables created successfully:
   - `user_profiles`
   - `user_albums`
   - `user_activities`
   - `user_follows`
   - `favorite_albums`

### Step 2.3: Get Production Credentials
**⏰ Time Required**: 2 minutes

1. **Go to**: Settings → API in your production Supabase project
2. **Copy**:
   - **Project URL**: `https://your-prod-id.supabase.co`
   - **Anon public key**: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...`
3. **Keep these safe** - you'll need them for environment configuration

---

## ⚙️ Phase 3: Environment Configuration

### Step 3.1: Create Production Environment File
**⏰ Time Required**: 5 minutes

1. **Navigate to**: `/workspace/Musicboxd/`
2. **Create**: `.env.production` (this will be in your .gitignore)
3. **Add content**:
```bash
# Production Environment
ENVIRONMENT=production
APP_NAME=Musicboxd
BUNDLE_ID=com.musicboxd.app

# Production Supabase credentials (from Step 2.3)
SUPABASE_URL=https://your-prod-id.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key_here

# Same Spotify credentials as development
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### Step 3.2: Update Bundle Identifier in Xcode
**⏰ Time Required**: 10 minutes

1. **Open**: `Musicboxd.xcworkspace` in Xcode
2. **Select**: Musicboxd project in navigator
3. **Select**: Musicboxd target
4. **General tab** → **Identity**:
   - **Bundle Identifier**: `com.musicboxd.app`
   - **Version**: `1.0`
   - **Build**: `1`
5. **Signing & Capabilities**:
   - **Team**: Select your Apple Developer team
   - **Provisioning Profile**: Xcode Managed Profile
6. **Build** project to verify no signing errors

---

## 🍎 Phase 4: Apple Sign-In Configuration

### Step 4.1: Enable Apple Sign-In Capability
**⏰ Time Required**: 10 minutes

1. **In Xcode** (Musicboxd project open):
2. **Select**: Musicboxd target
3. **Signing & Capabilities** tab
4. **Click**: `+ Capability`
5. **Add**: "Sign in with Apple"
6. **Verify**: Capability appears in list

### Step 4.2: Configure Apple Developer Portal
**⏰ Time Required**: 10 minutes

1. **Visit**: https://developer.apple.com/account/resources/identifiers/list
2. **Find**: Your app's Bundle ID (`com.musicboxd.app`)
3. **Edit**: Bundle ID configuration
4. **Enable**: "Sign in with Apple"
5. **Save** changes

### Step 4.3: Update Supabase Auth Configuration
**⏰ Time Required**: 15 minutes

1. **In production Supabase project**:
2. **Go to**: Authentication → Providers
3. **Configure Apple provider**:
   - **Enable Apple provider**: ✅
   - **Client ID**: `com.musicboxd.app` (your Bundle ID)
   - **Team ID**: Find in Apple Developer Account → Membership
   - **Key ID**: Create new key in Apple Developer → Keys
   - **Private Key**: Download .p8 file content
4. **Save** configuration

---

## 📱 Phase 5: TestFlight Setup

### Step 5.1: Create Archive Build
**⏰ Time Required**: 15 minutes

1. **In Xcode**:
2. **Select**: "Any iOS Device (arm64)" or connected device
3. **Product** → **Archive**
4. **Wait** for build to complete
5. **Organizer** window should open automatically

### Step 5.2: Upload to App Store Connect
**⏰ Time Required**: 20 minutes

1. **In Xcode Organizer**:
2. **Select** your archive
3. **Click**: "Distribute App"
4. **Choose**: "App Store Connect"
5. **Choose**: "Upload"
6. **Follow** upload wizard (accept defaults)
7. **Wait** for upload to complete

### Step 5.3: Configure TestFlight
**⏰ Time Required**: 10 minutes

1. **Visit**: https://appstoreconnect.apple.com/
2. **Select**: Your Musicboxd app
3. **TestFlight** tab
4. **Wait** for build to appear (10-15 minutes after upload)
5. **Add build** to TestFlight testing
6. **Complete** export compliance questions:
   - **Uses encryption**: No (unless using HTTPS, then Yes)
   - **Export compliance**: No

---

## 🧪 Phase 6: Testing & Validation

### Step 6.1: Internal Testing
**⏰ Time Required**: 30 minutes

1. **Add yourself** as internal tester in TestFlight
2. **Install TestFlight app** on your device
3. **Accept invitation** and install beta
4. **Test core flows**:
   - [ ] App launches without crashes
   - [ ] User can sign in with Google
   - [ ] User can sign in with Apple (new!)
   - [ ] Search and rate albums works
   - [ ] Social features work
   - [ ] Production database receives data

### Step 6.2: Production Environment Verification
**⏰ Time Required**: 15 minutes

1. **Test with production environment**:
```bash
ENVFILE=.env.production npm run ios
```
2. **Verify**:
   - [ ] App connects to production Supabase
   - [ ] No staging badge appears
   - [ ] Analytics are enabled
   - [ ] Error boundary works properly
   - [ ] All features functional

---

## 📊 Phase 7: Analytics & Monitoring Setup

### Step 7.1: Configure Supabase Analytics
**⏰ Time Required**: 10 minutes

1. **In production Supabase**:
2. **Go to**: Reports → Custom
3. **Enable** relevant metrics:
   - User registrations
   - Daily active users
   - API requests
   - Error rates

### Step 7.2: Prepare Error Monitoring
**⏰ Time Required**: 5 minutes

1. **Review**: `src/components/ErrorBoundary.tsx`
2. **Note**: Error boundary is configured for production
3. **Future**: Consider Sentry/Bugsnag integration if needed

---

## ✅ Week 7 Completion Checklist

Before marking Week 7 complete, verify:

### **Production Environment**
- [ ] Production Supabase project created and configured
- [ ] Database schema deployed to production
- [ ] Production environment file created locally
- [ ] App successfully connects to production database

### **Apple Integration**
- [ ] Apple Developer Program enrollment approved
- [ ] App Store Connect app created
- [ ] Apple Sign-In configured and working
- [ ] Bundle ID properly configured

### **TestFlight Ready**
- [ ] Archive build created successfully
- [ ] Build uploaded to App Store Connect
- [ ] TestFlight configured for internal testing
- [ ] Beta app installs and runs on device

### **Code Quality**
- [ ] No staging environment references remain
- [ ] Production environment properly detected
- [ ] Error boundary functioning
- [ ] All core features working in production

---

## 🚨 Common Issues & Solutions

### **Apple Developer Enrollment Delayed**
- **Issue**: Approval taking longer than 48 hours
- **Solution**: Contact Apple Developer support, have payment verification ready

### **Xcode Signing Errors**
- **Issue**: "Failed to register bundle identifier"
- **Solution**: Ensure Bundle ID matches exactly in Apple Developer portal

### **TestFlight Upload Fails**
- **Issue**: Archive upload rejected
- **Solution**: Check Bundle ID, version numbers, and Apple Developer team selection

### **Supabase Connection Issues**
- **Issue**: App can't connect to production database
- **Solution**: Verify URL and anon key in `.env.production`, check network connectivity

---

## 📈 Success Metrics for Week 7

By completion, you should achieve:
- **Production environment**: Fully functional and isolated
- **TestFlight**: Ready for beta tester distribution
- **Apple Sign-In**: Working alongside Google Sign-In
- **Zero crashes**: Error boundary prevents app crashes
- **Analytics**: Basic user tracking enabled

**🎉 Week 7 Success = Ready for Week 8 Beta Launch!**