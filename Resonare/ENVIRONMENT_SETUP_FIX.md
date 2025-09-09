# 🔧 Environment Setup Fix

## Issue: Regular `npm run ios` Not Working

Your app is configured with **environment-specific build schemes**. This is why the regular `npm run ios` command is crashing.

### **Available Build Commands:**

```bash
# Development Environment (recommended for local development)
npm run ios:dev
# Uses: ENVFILE=.env.development and Resonare-Development scheme

# Staging Environment  
npm run ios:staging
# Uses: ENVFILE=.env.staging and Resonare-Staging scheme

# Basic iOS (no environment - may crash)
npm run ios
# Uses: Default scheme without environment variables
```

### **What Went Wrong:**

1. You were correctly using `ENVFILE=.env.development npm run ios` before
2. The app expects environment variables to be loaded
3. Running `npm run ios` without environment causes crashes
4. The rebuild script was using the wrong command

### **Fixed Commands:**

✅ **For Apple Sign-In rebuild:**
```bash
./rebuild-with-apple-signin.sh
# Now uses: npm run ios:dev
```

✅ **For regular development:**
```bash
npm run ios:dev
```

✅ **For staging testing:**
```bash
npm run ios:staging
```

### **Environment Files Required:**

Make sure these exist in your project root:
- `.env.development` - For local development
- `.env.staging` - For staging environment
- `.env.production` - For production builds

### **Why This Setup Exists:**

Your app supports multiple environments with different:
- Supabase configurations
- API endpoints  
- Build schemes
- Environment-specific features

This is a **professional setup** that allows you to:
- Test against different backends
- Deploy to different environments
- Maintain separation between dev/staging/production

### **Quick Fix:**

Always use environment-specific commands:
```bash
# Instead of:
npm run ios

# Use:
npm run ios:dev
```

The rebuild script has been updated to use the correct command! 🎯