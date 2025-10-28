#!/usr/bin/env node

/**
 * Crash Analytics Verification Script
 * Verifies that crash analytics is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Crash Analytics Setup...\n');

const checks = [];

// Check if Firebase packages are installed
function checkPackages() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredPackages = [
    '@react-native-firebase/app',
    '@react-native-firebase/crashlytics'
  ];
  
  const missing = requiredPackages.filter(pkg => !deps[pkg]);
  
  if (missing.length === 0) {
    checks.push({ name: 'Firebase packages', status: '✅', details: 'All required packages installed' });
  } else {
    checks.push({ name: 'Firebase packages', status: '❌', details: `Missing: ${missing.join(', ')}` });
  }
}

// Check Android configuration
function checkAndroidConfig() {
  const configFiles = [
    'android/app/google-services.json',
    'android/app/build.gradle'
  ];
  
  let androidOk = true;
  const details = [];
  
  configFiles.forEach(file => {
    if (fs.existsSync(file)) {
      details.push(`✓ ${file}`);
    } else {
      androidOk = false;
      details.push(`✗ ${file} missing`);
    }
  });
  
  // Check build.gradle content
  if (fs.existsSync('android/app/build.gradle')) {
    const buildGradle = fs.readFileSync('android/app/build.gradle', 'utf8');
    if (buildGradle.includes('com.google.firebase.crashlytics')) {
      details.push('✓ Crashlytics plugin configured');
    } else {
      androidOk = false;
      details.push('✗ Crashlytics plugin not found in build.gradle');
    }
  }
  
  checks.push({ 
    name: 'Android configuration', 
    status: androidOk ? '✅' : '❌', 
    details: details.join('\n  ') 
  });
}

// Check iOS configuration
function checkIOSConfig() {
  const configFiles = [
    'ios/GoogleService-Info.plist',
    'ios/Podfile'
  ];
  
  let iosOk = true;
  const details = [];
  
  configFiles.forEach(file => {
    if (fs.existsSync(file)) {
      details.push(`✓ ${file}`);
    } else {
      iosOk = false;
      details.push(`✗ ${file} missing`);
    }
  });
  
  // Check Podfile content
  if (fs.existsSync('ios/Podfile')) {
    const podfile = fs.readFileSync('ios/Podfile', 'utf8');
    if (podfile.includes('Firebase/Crashlytics')) {
      details.push('✓ Crashlytics pod configured');
    } else {
      iosOk = false;
      details.push('✗ Crashlytics pod not found in Podfile');
    }
  }
  
  // Check if pods are installed
  if (fs.existsSync('ios/Podfile.lock')) {
    const podfileLock = fs.readFileSync('ios/Podfile.lock', 'utf8');
    if (podfileLock.includes('Firebase/Crashlytics')) {
      details.push('✓ Crashlytics pod installed');
    } else {
      details.push('⚠️ Crashlytics pod not installed (run pod install)');
    }
  } else {
    details.push('⚠️ Pods not installed (run pod install)');
  }
  
  checks.push({ 
    name: 'iOS configuration', 
    status: iosOk ? '✅' : '❌', 
    details: details.join('\n  ') 
  });
}

// Check service implementation
function checkServiceImplementation() {
  const serviceFile = 'src/services/crashAnalytics.ts';
  
  if (fs.existsSync(serviceFile)) {
    const service = fs.readFileSync(serviceFile, 'utf8');
    const features = [
      { name: 'Error recording', check: 'recordError' },
      { name: 'Non-fatal errors', check: 'recordNonFatalError' },
      { name: 'User identification', check: 'setUserId' },
      { name: 'Custom attributes', check: 'setUserAttributes' },
      { name: 'Environment awareness', check: 'Environment' }
    ];
    
    const implemented = features.filter(f => service.includes(f.check));
    const missing = features.filter(f => !service.includes(f.check));
    
    checks.push({
      name: 'Service implementation',
      status: missing.length === 0 ? '✅' : '⚠️',
      details: `${implemented.length}/${features.length} features implemented`
    });
  } else {
    checks.push({
      name: 'Service implementation',
      status: '❌',
      details: 'crashAnalytics.ts not found'
    });
  }
}

// Check integration points
function checkIntegration() {
  const integrationPoints = [
    { file: 'App.tsx', check: 'initializeCrashAnalytics' },
    { file: 'src/components/ErrorBoundary.tsx', check: 'recordError' },
    { file: 'src/config/environment.ts', check: 'crashAnalytics' }
  ];
  
  const details = [];
  let allIntegrated = true;
  
  integrationPoints.forEach(point => {
    if (fs.existsSync(point.file)) {
      const content = fs.readFileSync(point.file, 'utf8');
      if (content.includes(point.check)) {
        details.push(`✓ ${point.file}`);
      } else {
        allIntegrated = false;
        details.push(`✗ ${point.file} - missing integration`);
      }
    } else {
      allIntegrated = false;
      details.push(`✗ ${point.file} - file not found`);
    }
  });
  
  checks.push({
    name: 'Integration points',
    status: allIntegrated ? '✅' : '❌',
    details: details.join('\n  ')
  });
}

// Run all checks
try {
  checkPackages();
  checkAndroidConfig();
  checkIOSConfig();
  checkServiceImplementation();
  checkIntegration();
} catch (error) {
  console.error('Error running verification:', error.message);
  process.exit(1);
}

// Display results
console.log('📋 Verification Results:\n');

checks.forEach(check => {
  console.log(`${check.status} ${check.name}`);
  if (check.details) {
    console.log(`  ${check.details.replace(/\n/g, '\n  ')}`);
  }
  console.log();
});

// Summary
const passed = checks.filter(c => c.status === '✅').length;
const total = checks.length;
const warnings = checks.filter(c => c.status === '⚠️').length;
const failed = checks.filter(c => c.status === '❌').length;

console.log('📊 Summary:');
console.log(`  ✅ Passed: ${passed}/${total}`);
if (warnings > 0) console.log(`  ⚠️ Warnings: ${warnings}`);
if (failed > 0) console.log(`  ❌ Failed: ${failed}`);

console.log('\n💡 Next Steps:');
if (failed > 0) {
  console.log('  1. Fix failed checks above');
}
if (warnings > 0) {
  console.log('  2. Address warnings (run pod install for iOS)');
}
console.log('  3. Test in development environment');
console.log('  4. Build and test in staging/production');
console.log('  5. Monitor Firebase Console for crash reports');

console.log('\n📖 See CRASH_ANALYTICS_SETUP.md for detailed instructions');

if (failed === 0) {
  console.log('\n🎉 Crash analytics setup looks good!');
  process.exit(0);
} else {
  process.exit(1);
}