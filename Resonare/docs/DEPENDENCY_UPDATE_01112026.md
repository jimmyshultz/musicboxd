# Dependency Update Analysis
**Date:** January 11, 2026  
**Analyzed by:** AI Code Review  
**Application:** Resonare (React Native Music Tracking App)

---

## Executive Summary

This document outlines the dependency update strategy for Resonare following the successful completion of Phase 1 updates. All safe minor/patch updates and the React Native 0.83.1 upgrade have been completed. Six major version updates remain, requiring careful migration planning due to breaking changes.

**What Was Completed (January 11, 2026):**
- ✅ React Native: 0.80.1 → 0.83.1
- ✅ React: 19.1.0 → 19.2.3
- ✅ 25+ minor/patch dependency updates
- ✅ iOS pods updated and verified
- ✅ Dependabot configured for automated updates
- ✅ react-native-reanimated: 3.18.0 → 4.2.1

**What Remains:**
- 🟡 2 medium-impact updates requiring testing
- 🟢 3 low-impact tooling updates

**Estimated Total Effort:** 4-6 hours across 2-3 PRs

---

## ✅ Phase 1: Completed Updates (January 11, 2026)

### Core Framework Updates

#### React Native 0.80.1 → 0.83.1
**Status:** ✅ COMPLETED

**Changes Made:**
- Updated `react-native` to 0.83.1
- Updated all `@react-native/*` packages to 0.83.1
- Updated React Native CLI to 20.1.0
- Updated `react` and `react-test-renderer` to 19.2.3
- Reinstalled iOS pods for native dependencies
- Cleared Metro and build caches

**Impact:**
- Fixed React version mismatch error
- Gained 3 versions of React Native improvements
- Better performance and bug fixes
- Improved New Architecture support
- Compatible with latest React 19.2.3

### Safe Dependency Updates

Updated the following to latest minor/patch versions:

**State Management & Navigation:**
- `@supabase/supabase-js`: ^2.45.4 → ^2.90.1
- `@reduxjs/toolkit`: ^2.8.2 → ^2.11.2
- `@react-navigation/bottom-tabs`: ^7.4.2 → ^7.9.0
- `@react-navigation/native`: ^7.1.14 → ^7.1.26
- `@react-navigation/stack`: ^7.4.2 → ^7.6.13

**React Native Libraries:**
- `react-native-gesture-handler`: ^2.27.1 → ^2.30.0
- `react-native-screens`: ^4.13.1 → ^4.19.0
- `react-native-safe-area-context`: ^5.5.2 → ^5.6.2
- `@react-native-community/datetimepicker`: ^8.2.0 → ^8.6.0
- `@invertase/react-native-apple-authentication`: ^2.4.1 → ^2.5.1
- `react-native-google-mobile-ads`: ^16.0.0 → ^16.0.1
- `react-native-config`: ^1.5.6 → ^1.6.1
- `react-native-webview`: ^13.15.0 → ^13.16.0
- `react-native-share`: ^12.2.0 → ^12.2.2
- `react-native-image-crop-picker`: ^0.51.0 → ^0.51.1

**Build Tools:**
- `@babel/core`: ^7.25.2 → ^7.28.5
- `@babel/preset-env`: ^7.25.3 → ^7.28.5
- `@babel/runtime`: ^7.25.0 → ^7.28.4

**TypeScript:**
- `typescript`: ^5.9.2 → ^5.9.3
- `@types/react`: ^19.1.0 → ^19.2.7
- `@types/lodash`: ^4.17.20 → ^4.17.21

### Infrastructure

#### Dependabot Configuration
**Status:** ✅ COMPLETED

**Created:** `.github/dependabot.yml`

**Features:**
- Weekly automated dependency checks (Fridays at 9:00 AM CT)
- Smart grouping of related packages
- Ignores major versions requiring manual migration
- Automatic PR creation with labels
- Limits to 10 PRs at a time to avoid overload

**Groups Configured:**
- `react-native` - All React Native packages
- `navigation` - React Navigation packages
- `firebase` - Firebase packages
- `babel` - Babel packages
- `typescript` - TypeScript and type definitions
- `testing` - Jest and testing packages

---

## 🔴 Phase 2: High Priority Updates

### 1. react-native-reanimated 3.18 → 4.2.1

**Priority:** 🔴 HIGH  
**Effort:** Medium (4-6 hours)  
**Impact:** Very High (Breaking API changes)  
**Status:** ✅ COMPLETED (January 11, 2026)

**Location:**
- `package.json` - Current: ^3.18.0, Target: ^4.2.1

**Problem:**
Reanimated 4 includes significant breaking changes to animation APIs. The app currently uses Reanimated 3 APIs which are deprecated or incompatible with v4.

**Breaking Changes in Reanimated 4:**

1. **New Hook Pattern:**
```typescript
// Before (Reanimated 3)
const animatedValue = useSharedValue(0);
const animatedStyle = useAnimatedStyle(() => {
  return { opacity: animatedValue.value };
});

// After (Reanimated 4) - Same syntax, but internal changes
// API is backward compatible for basic uses
```

2. **Layout Animations:**
```typescript
// Before (Reanimated 3)
import { Layout, FadeIn } from 'react-native-reanimated';
<Animated.View entering={FadeIn} layout={Layout}>

// After (Reanimated 4) - New animation names and options
import { LinearTransition, FadeIn } from 'react-native-reanimated';
<Animated.View entering={FadeIn} layout={LinearTransition}>
```

3. **Gesture Handler Integration:**
- Better integration with gesture-handler
- Some gesture callbacks have different signatures
- Improved concurrent gesture handling

**Files Likely Affected:**
Run this to find files using Reanimated:
```bash
cd /Users/jimmyshultz/Developer/musicboxd/Resonare
grep -r "react-native-reanimated" src/ --include="*.tsx" --include="*.ts"
grep -r "useSharedValue\|useAnimatedStyle\|withTiming\|withSpring" src/ --include="*.tsx"
```

**Migration Steps:**

1. **Pre-Migration Audit:**
```bash
# Find all Reanimated usage
grep -r "from 'react-native-reanimated'" src/ -l
```

2. **Update Package:**
```bash
npm install react-native-reanimated@^4.2.1
cd ios && pod install && cd ..
```

3. **Review Migration Guide:**
- Read: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/migration-from-3.x
- Check breaking changes list
- Note deprecated APIs

4. **Update Configuration:**
```javascript
// babel.config.js - Ensure Reanimated plugin is properly configured
module.exports = {
  plugins: [
    'react-native-reanimated/plugin', // Must be last
  ],
};
```

5. **Test Animated Components:**
- Search screen animations
- Navigation transitions
- Card animations
- Gesture-based interactions
- Modal transitions

6. **Update Tests:**
```bash
npm test
```

**Estimated Impact:**
- 🎯 **Animation Performance:** Improved (new architecture optimizations)
- 🎯 **Bundle Size:** Similar
- 🎯 **Code Changes:** 5-15 files likely affected
- 🎯 **Testing:** Thorough testing of all animations required

**Rollback Plan:**
If issues arise, revert with:
```bash
npm install react-native-reanimated@^3.18.0
cd ios && pod install && cd ..
```

---

## 🟡 Phase 3: Medium Priority Updates

### 2. @react-native-google-signin/google-signin 15.0 → 16.1.1

**Priority:** 🟡 MEDIUM  
**Effort:** Low-Medium (2-3 hours)  
**Impact:** Medium (Authentication flow)  
**Status:** 📋 TODO

**Location:**
- `package.json` - Current: ^15.0.0, Target: ^16.1.1
- `src/services/authService.ts` - Google Sign-In implementation
- `src/screens/Auth/AuthScreen.tsx` - Sign-in UI

**Problem:**
Major version change likely includes breaking changes to authentication flow or configuration. Authentication is critical path, so thorough testing is essential.

**Migration Steps:**

1. **Review Release Notes:**
```bash
# Check what changed between v15 and v16
open https://github.com/react-native-google-signin/google-signin/releases
```

2. **Update Package:**
```bash
npm install @react-native-google-signin/google-signin@^16.1.1
cd ios && pod install && cd ..
```

3. **Update iOS Configuration (if needed):**
```bash
# Check if GoogleService-Info.plist needs updates
open ios/GoogleService-Info.plist
```

4. **Update Android Configuration (if needed):**
```bash
# Check if google-services.json or build.gradle needs updates
cat android/app/google-services.json
```

5. **Test Authentication Flows:**
- ✅ Google Sign-In (iOS)
- ✅ Google Sign-In (Android)
- ✅ Sign-Out
- ✅ Account switching
- ✅ Token refresh
- ✅ Error handling (no Google account)

6. **Verify Supabase Integration:**
```typescript
// Ensure token exchange still works
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: idToken,
});
```

**Files to Review:**
```
src/services/authService.ts (lines 129-198) - Google Sign-In implementation
src/screens/Auth/AuthScreen.tsx - Sign-in button and flow
```

**Estimated Impact:**
- 🎯 **Breaking Changes:** Possible (check release notes)
- 🎯 **Testing Required:** High (authentication is critical)
- 🎯 **Code Changes:** 1-3 files likely
- 🎯 **Risk:** Medium (authentication failure = cannot use app)

**Testing Checklist:**
- [ ] Sign in with Google (iOS)
- [ ] Sign in with Google (Android)
- [ ] Sign out
- [ ] Token refresh on app restart
- [ ] Handle "no Google account" error
- [ ] Handle network errors
- [ ] Verify user data syncs to Supabase

---

### 3. react-native-url-polyfill 2.0 → 3.0

**Priority:** 🟡 MEDIUM  
**Effort:** Low (1 hour)  
**Impact:** Low (Polyfill library)  
**Status:** 📋 TODO

**Location:**
- `package.json` - Current: ^2.0.0, Target: ^3.0.0

**Problem:**
Major version change in URL polyfill. Used by Supabase and other libraries for URL parsing in React Native. Breaking changes are likely minimal since it's a polyfill.

**Migration Steps:**

1. **Update Package:**
```bash
npm install react-native-url-polyfill@^3.0.0
```

2. **Test URL-Dependent Features:**
- Supabase client initialization
- Deep linking
- OAuth redirects
- Spotify API calls

3. **Run Tests:**
```bash
npm test
```

**Estimated Impact:**
- 🎯 **Breaking Changes:** Unlikely (polyfill library)
- 🎯 **Testing Required:** Low (passive library)
- 🎯 **Code Changes:** None expected
- 🎯 **Risk:** Very Low

**Notes:**
- Polyfill libraries rarely have breaking changes
- Mostly internal implementation improvements
- Safe to update alongside other changes

---

## 🟢 Phase 4: Low Priority Tooling Updates

### 4. eslint 8.19 → 9.39.2

**Priority:** 🟢 LOW  
**Effort:** Medium (3-4 hours)  
**Impact:** Low (Development only)  
**Status:** 📋 TODO

**Location:**
- `package.json` - Current: ^8.19.0, Target: ^9.39.2
- `.eslintrc.js` or similar - Needs migration to flat config

**Problem:**
ESLint 9 requires migrating from `.eslintrc.*` format to new flat config format (`eslint.config.js`). This is a significant configuration change but doesn't affect runtime code.

**Breaking Changes in ESLint 9:**

1. **Flat Config Format:**
```javascript
// Before (.eslintrc.js)
module.exports = {
  extends: ['@react-native-community'],
  rules: {
    'react-native/no-inline-styles': 'warn',
  },
};

// After (eslint.config.js)
import reactNative from '@react-native-community/eslint-config';

export default [
  ...reactNative,
  {
    rules: {
      'react-native/no-inline-styles': 'warn',
    },
  },
];
```

2. **New Plugin System:**
- Plugins now specified differently
- Some plugins may need updates
- TypeScript parser configuration changes

**Migration Steps:**

1. **Check Current Config:**
```bash
# Find ESLint config file
find . -name ".eslintrc*" -o -name "eslint.config.*"
```

2. **Use Migration Tool:**
```bash
# ESLint provides migration tool
npx @eslint/migrate-config .eslintrc.js
```

3. **Update Package:**
```bash
npm install eslint@^9.39.2
```

4. **Migrate Configuration:**
- Read migration guide: https://eslint.org/docs/latest/use/configure/migration-guide
- Convert `.eslintrc.js` to `eslint.config.js`
- Update plugin imports
- Test all rules still work

5. **Verify Linting:**
```bash
npm run lint
```

6. **Update CI/CD:**
- Ensure CI/CD pipelines work with new config
- Update any lint-staged configurations

**Estimated Impact:**
- 🎯 **Runtime:** None (development tool only)
- 🎯 **Configuration:** Complete rewrite required
- 🎯 **Rules:** May need adjustment
- 🎯 **CI/CD:** May need updates

**Recommendation:**
Update in a separate PR dedicated to tooling changes. Low priority since it doesn't affect app functionality.

---

### 5. jest 29.6 → 30.2.0 + @types/jest 29.5 → 30.0

**Priority:** 🟢 LOW  
**Effort:** Low-Medium (2-3 hours)  
**Impact:** Low (Testing framework)  
**Status:** 📋 TODO

**Location:**
- `package.json` - Current: ^29.6.3 / ^29.5.13, Target: ^30.2.0 / ^30.0.0
- `jest.config.js` - May need configuration updates
- `jest.setup.js` - May need setup updates

**Problem:**
Jest 30 is a major version with potential breaking changes to test runner, matchers, and configuration. All existing tests need to pass.

**Migration Steps:**

1. **Update Packages:**
```bash
npm install jest@^30.2.0 @types/jest@^30.0.0 --save-dev
```

2. **Review Breaking Changes:**
```bash
# Check Jest 30 release notes
open https://jestjs.io/blog/
```

3. **Update Configuration (if needed):**
```javascript
// jest.config.js - may need updates for Jest 30
module.exports = {
  preset: 'react-native',
  // Check if any config options are deprecated
};
```

4. **Run Test Suite:**
```bash
npm test
```

5. **Fix Any Broken Tests:**
- Update deprecated matchers
- Fix changed API calls
- Update snapshot tests if needed

6. **Update Test Scripts:**
```bash
# Verify all test commands work
npm test
npm test -- --coverage
npm test -- --watch
```

**Estimated Impact:**
- 🎯 **Test Results:** Should remain the same
- 🎯 **Breaking Changes:** Check release notes
- 🎯 **Code Changes:** 0-5 test files may need updates
- 🎯 **Performance:** Likely improved

**Testing Checklist:**
- [ ] All unit tests pass
- [ ] Coverage reports generate
- [ ] Watch mode works
- [ ] CI/CD pipeline passes
- [ ] Snapshot tests are valid

---

### 6. prettier 2.8.8 → 3.7.4

**Priority:** 🟢 LOW  
**Effort:** Low (1-2 hours)  
**Impact:** Low (Code formatting)  
**Status:** 📋 TODO

**Location:**
- `package.json` - Current: 2.8.8, Target: 3.7.4
- `.prettierrc` or similar - May need updates

**Problem:**
Prettier 3 includes formatting changes that will affect existing code. Running Prettier after the update will reformat files, creating a large diff.

**Migration Steps:**

1. **Review Prettier 3 Changes:**
```bash
# Check what formatting changes were made
open https://prettier.io/blog/2023/07/05/3.0.0.html
```

2. **Update Package:**
```bash
npm install prettier@^3.7.4 --save-dev
```

3. **Verify Configuration:**
```javascript
// .prettierrc - check if any options are deprecated
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2
}
```

4. **Run Prettier on Entire Codebase:**
```bash
# Format all files
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json}"
```

5. **Commit Formatting Changes:**
```bash
git add .
git commit -m "chore: apply Prettier 3 formatting changes"
```

6. **Separate from Code Changes:**
- Create dedicated PR for formatting changes only
- Makes code review easier
- Prevents mixing functional changes with formatting

**Estimated Impact:**
- 🎯 **Code Behavior:** None (formatting only)
- 🎯 **Files Changed:** 50-100+ files (formatting)
- 🎯 **Review Difficulty:** High (large diff)
- 🎯 **Risk:** None (can be reverted)

**Recommendation:**
- Update in a separate PR titled "chore: update Prettier to v3"
- Run formatting on entire codebase at once
- Get team alignment on new formatting rules
- Consider doing this during low-activity period

---

## 📊 Implementation Priority Matrix

| # | Update | Priority | Effort | Risk | Impact | Recommended Phase |
|---|--------|----------|--------|------|--------|-------------------|
| 1 | react-native-reanimated 3→4 | ✅ Done | Medium | High | Very High | ~~Phase 2~~ COMPLETED |
| 2 | google-signin 15→16 | 🟡 Medium | Low-Med | Medium | Medium | Phase 3 (Week 2-3) |
| 3 | url-polyfill 2→3 | 🟡 Medium | Low | Low | Low | Phase 3 (Week 2-3) |
| 4 | eslint 8→9 | 🟢 Low | Medium | None | Low | Phase 4 (Week 4+) |
| 5 | jest 29→30 | 🟢 Low | Low-Med | Low | Low | Phase 4 (Week 4+) |
| 6 | prettier 2→3 | 🟢 Low | Low | None | None | Phase 4 (Week 4+) |

---

## 🎯 Recommended Implementation Plan

### Week 1-2: High Priority (Reanimated)

**Goal:** Update Reanimated to v4 and ensure animations work correctly.

**Tasks:**
1. Audit all Reanimated usage in codebase
2. Review Reanimated 4 migration guide
3. Update package and iOS pods
4. Test all animated components
5. Fix any breaking changes
6. Update tests
7. Submit PR for review

**Testing Focus:**
- All animation-based components
- Navigation transitions
- Gesture handlers
- Performance testing

**Branch:** `feature/update-reanimated-v4`

---

### Week 2-3: Medium Priority (Authentication & Polyfill)

**Goal:** Update Google Sign-In and URL polyfill.

**Tasks:**
1. Update google-signin to v16
2. Review release notes
3. Test authentication flows (iOS + Android)
4. Update url-polyfill to v3
5. Test URL-dependent features
6. Submit PR for review

**Testing Focus:**
- Google Sign-In flow
- Token refresh
- Supabase integration
- Deep linking
- OAuth redirects

**Branch:** `feature/update-auth-deps`

---

### Week 4+: Low Priority (Tooling)

**Goal:** Update development tooling without affecting runtime.

**Tasks:**
1. **Option A: One large PR**
   - Update ESLint, Jest, and Prettier together
   - One CI/CD pass
   - Single review process

2. **Option B: Separate PRs** (Recommended)
   - PR 1: ESLint 9 migration (config changes)
   - PR 2: Jest 30 update (test updates)
   - PR 3: Prettier 3 (formatting only)
   - Easier to review
   - Can be done independently

**Testing Focus:**
- Lint passes
- Tests pass
- CI/CD pipeline works
- Code formatting is consistent

**Branches:**
- `chore/update-eslint-v9`
- `chore/update-jest-v30`
- `chore/update-prettier-v3`

---

## 🔄 Dependabot Integration

With Dependabot configured, future updates will be automated:

### What Dependabot Will Handle:
- ✅ Minor version updates (automatic PRs)
- ✅ Patch version updates (automatic PRs)
- ✅ Security updates (immediate PRs)
- ✅ Grouped updates by category

### What Requires Manual Work:
- ❌ Major version updates (ignored in config)
- ❌ Breaking changes (requires migration)
- ❌ Configuration changes (ESLint, Jest, etc.)
- ❌ Native module updates (requires pod install)

### Dependabot Workflow:
1. **Friday morning:** Dependabot checks for updates
2. **PRs created:** Grouped by category with labels
3. **Review:** Check PR description and changelogs
4. **Test:** CI/CD pipeline runs automatically
5. **Merge:** If tests pass and changes are safe
6. **Deploy:** Follow normal deployment process

---

## 📋 Pre-Update Checklist

Before updating any dependency:

- [ ] **Backup:** Commit all current changes
- [ ] **Branch:** Create feature branch
- [ ] **Review:** Read release notes and migration guides
- [ ] **Dependencies:** Check for peer dependency updates
- [ ] **Native:** Plan for `pod install` if needed
- [ ] **Tests:** Ensure test suite is passing
- [ ] **CI/CD:** Verify pipeline is working

---

## 🧪 Testing Strategy

### For Each Update:

**1. Unit Tests:**
```bash
npm test
```

**2. Lint Check:**
```bash
npm run lint
```

**3. TypeScript:**
```bash
npx tsc --noEmit
```

**4. iOS Build:**
```bash
cd ios && pod install && cd ..
npx react-native run-ios
```

**5. Android Build:**
```bash
npx react-native run-android
```

**6. Manual Testing:**
- Core user flows
- Updated feature specifically
- Authentication
- Data persistence
- Navigation

**7. Performance:**
- App startup time
- Animation smoothness
- Memory usage
- Bundle size

---

## 🚨 Rollback Procedures

If an update causes critical issues:

### Immediate Rollback:
```bash
# Revert to previous version
npm install package-name@previous-version
cd ios && pod install && cd ..

# Rebuild
npx react-native start --reset-cache
```

### Git Rollback:
```bash
# Revert the commit
git revert <commit-hash>

# Or reset branch
git reset --hard origin/main

# Reinstall dependencies
npm install
cd ios && pod install && cd ..
```

### Emergency Deployment:
If update went to production:
1. Revert to previous commit
2. Build emergency release
3. Submit to App Store/Play Store
4. Notify users via in-app message

---

## 📊 Success Metrics

Track these metrics before and after updates:

### Performance:
- App startup time (target: < 2s)
- Screen transition time (target: < 100ms)
- Animation FPS (target: 60 FPS)
- Bundle size (monitor growth)

### Stability:
- Crash rate (target: < 0.1%)
- ANR rate (Android, target: < 0.1%)
- Authentication success rate (target: > 99%)

### Developer Experience:
- CI/CD pipeline time
- Lint/test execution time
- Build time (iOS + Android)

---

## 📚 Reference Documentation

### Official Migration Guides:
- [Reanimated 3→4](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/migration-from-3.x)
- [ESLint 8→9](https://eslint.org/docs/latest/use/configure/migration-guide)
- [Jest 30 Release](https://jestjs.io/blog/)
- [Prettier 3 Release](https://prettier.io/blog/2023/07/05/3.0.0.html)

### Package Release Pages:
- [react-native-reanimated releases](https://github.com/software-mansion/react-native-reanimated/releases)
- [google-signin releases](https://github.com/react-native-google-signin/google-signin/releases)
- [eslint releases](https://github.com/eslint/eslint/releases)

---

## 🎉 Completion Checklist

Mark items as you complete them:

### Phase 1: Foundation (Completed ✅)
- [x] React Native 0.83.1
- [x] React 19.2.3
- [x] All minor/patch updates
- [x] Dependabot configuration
- [x] Responsive layout fixes
- [x] Lint error cleanup

### Phase 2: High Priority (Completed ✅)
- [x] react-native-reanimated 4.2.1
  - [x] Audit usage
  - [x] Update package
  - [x] Test animations
  - [x] Fix breaking changes
  - [x] PR submitted and merged

### Phase 3: Medium Priority
- [ ] @react-native-google-signin/google-signin 16.1.1
  - [ ] Review release notes
  - [ ] Update package
  - [ ] Test auth flows
  - [ ] Verify Supabase integration
  - [ ] PR submitted and merged
- [ ] react-native-url-polyfill 3.0
  - [ ] Update package
  - [ ] Test URL features
  - [ ] PR submitted and merged

### Phase 4: Low Priority (Tooling)
- [ ] eslint 9.39.2
  - [ ] Migrate to flat config
  - [ ] Update plugins
  - [ ] Verify rules
  - [ ] PR submitted and merged
- [ ] jest 30.2.0
  - [ ] Update package
  - [ ] Fix test issues
  - [ ] Verify coverage
  - [ ] PR submitted and merged
- [ ] prettier 3.7.4
  - [ ] Update package
  - [ ] Reformat codebase
  - [ ] Commit formatting changes
  - [ ] PR submitted and merged

---

## 🎯 Final Notes

**Estimated Timeline:**
- **Phase 2 (High Priority):** 1-2 weeks
- **Phase 3 (Medium Priority):** 1 week
- **Phase 4 (Low Priority):** 1-2 weeks (can be done gradually)
- **Total:** 3-5 weeks if done sequentially, or 2-3 weeks if parallelized

**Parallelization Strategy:**
- Phases 2 and 3 can be done in parallel if you have time
- Phase 4 items are independent and can be done anytime
- Dependabot will handle future updates automatically

**Maintenance Window:**
After all updates are complete, you'll have:
- ✅ Modern dependency versions
- ✅ Automated update PRs via Dependabot
- ✅ Reduced technical debt
- ✅ Better performance and stability
- ✅ Easier future maintenance

---

*Document created: January 11, 2026*  
*Last updated: January 11, 2026 (Reanimated update completed)*
