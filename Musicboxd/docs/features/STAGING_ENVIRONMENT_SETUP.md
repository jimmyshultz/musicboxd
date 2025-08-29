# 🚀 Staging Environment Setup Guide

## Overview

Complete guide for setting up a staging environment using React Native Config for environment management and a separate Supabase project for safe testing.

## Purpose of Staging Environment

### **What It's For:**
- 🧪 **Testing new features** without affecting production data
- 🔄 **Database migrations** and schema changes
- 👥 **User acceptance testing** with stakeholders
- 🐛 **Bug reproduction** in controlled environment
- 📊 **Performance testing** with larger datasets
- 🚀 **Deployment validation** before production releases

## Setup Approach

After testing multiple approaches, we settled on the **Simple Environment File** method using `react-native-config` for reliability.

## Implementation

### **Environment Files**
- `.env.development` → Development database credentials
- `.env.staging` → Staging database credentials  
- `.env.production` → Production database credentials
- `src/config/env.ts` → Configuration loader using react-native-config

### **Build Scripts**
Updated `package.json` with environment-specific commands:
```json
{
  "ios:dev": "ENVFILE=.env.development react-native run-ios",
  "ios:staging": "ENVFILE=.env.staging react-native run-ios",
  "android:dev": "ENVFILE=.env.development react-native run-android",
  "android:staging": "ENVFILE=.env.staging react-native run-android"
}
```

### **Database Setup**
- **Staging Supabase Project**: Complete separate instance
- **Schema Replication**: Used `schema_v2.sql` for consistency
- **RLS Policy Export**: Exported policies from production for exact replication

## Configuration Structure

### **Environment Config (`src/config/env.ts`)**
```typescript
import Config from 'react-native-config';

export const ENV_CONFIG = {
  ENVIRONMENT: Config.ENVIRONMENT || 'development',
  SUPABASE_URL: Config.SUPABASE_URL!,
  SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY!,
  SPOTIFY_CLIENT_ID: Config.SPOTIFY_CLIENT_ID!,
};
```

### **Supabase Client (`src/services/supabase.ts`)**
Already configured to use `ENV_CONFIG` with environment-specific logging.

## Staging Database Issues Resolved

### **Missing Tables**
- Added `favorite_albums` table to `schema_v2.sql`
- Ensured all production tables exist in staging

### **RLS Policy Gaps**
- Exported all policies from production database
- Applied complete policy set to staging
- Fixed missing INSERT policies for `user_activities`

### **Empty Data Handling**
- Fixed `.slice()` errors with undefined mock data
- Added defensive coding for empty staging environment
- Proper fallbacks for missing data scenarios

## Usage Instructions

### **Development Testing**
```bash
ENVFILE=.env.development npm run ios
```

### **Staging Testing**  
```bash
ENVFILE=.env.staging npm run ios
```

### **Switching Environments**
Just change the `ENVFILE` parameter - no code changes needed.

## Benefits Achieved

### **✅ Safety**
- Complete isolation between environments
- No risk of corrupting production data
- Safe testing of database changes

### **✅ Reliability**  
- Exact replication of production policies
- Consistent behavior across environments
- Automated environment switching

### **✅ Team Collaboration**
- Shared staging environment for testing
- Reproducible builds across developers
- Clear separation of concerns

## Advanced Setup (Archived)

We initially attempted a more complex setup with:
- Custom Xcode schemes and build configurations
- Separate app bundle IDs for side-by-side installation
- Advanced CocoaPods configuration

**Result**: C++ compilation errors due to build configuration complexity.

**Decision**: Prioritized functionality over advanced build features.

**Future**: Can revisit advanced setup when needed for production deployment.

## Maintenance

### **Schema Updates**
1. Apply changes to `schema_v2.sql`
2. Test in staging environment
3. Apply to production after validation

### **Policy Updates**
1. Export policies from production after changes
2. Apply to staging for consistency
3. Document any differences

### **Environment Credentials**
- Keep environment files in `.gitignore`
- Use example files for documentation
- Rotate staging credentials periodically

---

**This staging environment provides a professional, safe testing infrastructure for continued development.** ✅