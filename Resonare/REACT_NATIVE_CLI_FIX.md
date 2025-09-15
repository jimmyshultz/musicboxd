# 🔧 React Native CLI Fix Applied

## The Problem

You were getting:
```
error: unknown command 'run-ios'
```

## Why This Happens

The `react-native` command isn't in your global PATH, but it exists in `node_modules/.bin/`. npm scripts need to use `npx` to find it.

## The Fix Applied

✅ **Updated all package.json scripts** to use `npx react-native` instead of `react-native`

**Before:**
```json
"ios": "react-native run-ios"
```

**After:**
```json
"ios": "npx react-native run-ios"
```

## Commands That Now Work

```bash
# Development build
ENVFILE=.env.development npm run ios

# Production build  
ENVFILE=.env.production npm run ios

# Basic build
npm run ios

# Other commands
npm run android
npm run start
```

## Why We Use npx

- `npx` looks in `node_modules/.bin/` for commands
- Ensures we use the local React Native CLI version
- Works consistently across different environments
- No need to install React Native CLI globally

The fix is now applied and your commands should work! 🚀