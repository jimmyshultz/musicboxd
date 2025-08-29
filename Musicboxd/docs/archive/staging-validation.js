#!/usr/bin/env node

/**
 * Staging Environment Validation Script
 * 
 * This script validates that all Week 5 social features are working
 * correctly in the staging environment before production deployment.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorLog(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function validateFeature(feature, tests) {
  colorLog(colors.blue, `\n🧪 Testing: ${feature}`);
  colorLog(colors.cyan, '='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n📋 ${test.description}`);
    if (test.steps) {
      test.steps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
    }
    
    const result = await askQuestion('\n✅ Did this test pass? (y/n): ');
    
    if (result.toLowerCase() === 'y' || result.toLowerCase() === 'yes') {
      colorLog(colors.green, '✅ PASSED');
      passed++;
    } else {
      colorLog(colors.red, '❌ FAILED');
      failed++;
      
      const notes = await askQuestion('📝 Notes about the failure (optional): ');
      if (notes.trim()) {
        console.log(`   Notes: ${notes}`);
      }
    }
  }
  
  colorLog(colors.cyan, '\n' + '='.repeat(50));
  colorLog(colors.bright, `📊 ${feature} Results: ${passed} passed, ${failed} failed`);
  
  return { passed, failed, total: tests.length };
}

async function main() {
  colorLog(colors.magenta, '🚀 Musicboxd Staging Environment Validation');
  colorLog(colors.magenta, '🎯 Week 5: Social Features Testing');
  console.log('\nThis script will guide you through testing all Week 5 deliverables.\n');
  
  const features = [
    {
      name: 'User Search & Discovery',
      tests: [
        {
          description: 'Search users by username',
          steps: [
            'Open the app and go to Search tab',
            'Toggle to "Users" mode',
            'Search for a username (create test users if needed)',
            'Verify search results show matching users',
            'Verify search is case-insensitive'
          ]
        },
        {
          description: 'Search users by display name',
          steps: [
            'Search for a display name',
            'Verify users with matching display names appear',
            'Verify both partial and full name matches work'
          ]
        },
        {
          description: 'User profile navigation',
          steps: [
            'Tap on a user from search results',
            'Verify navigation to user profile works',
            'Verify user profile displays correctly'
          ]
        }
      ]
    },
    {
      name: 'Follow/Unfollow System',
      tests: [
        {
          description: 'Follow a user',
          steps: [
            'Navigate to another user\'s profile',
            'Tap the Follow button',
            'Verify button changes to "Following"',
            'Check that follow count increases',
            'Verify the follow appears in your Following list'
          ]
        },
        {
          description: 'Unfollow a user',
          steps: [
            'Go to a user you\'re following',
            'Tap the "Following" button',
            'Verify button changes back to "Follow"',
            'Check that follow count decreases',
            'Verify the user is removed from your Following list'
          ]
        },
        {
          description: 'Follow/followers lists',
          steps: [
            'Go to your profile',
            'Tap on "Followers" count',
            'Verify followers list displays correctly',
            'Tap on "Following" tab',
            'Verify following list displays correctly',
            'Test navigation to profiles from these lists'
          ]
        }
      ]
    },
    {
      name: 'Home Page Social Discovery',
      tests: [
        {
          description: 'Popular This Week section',
          steps: [
            'Go to Home tab',
            'Verify "Popular This Week" section displays',
            'Tap "Popular This Week" to navigate to full screen',
            'Verify albums are displayed correctly',
            'Test navigation back to home'
          ]
        },
        {
          description: 'New From Friends section',
          steps: [
            'In Home tab, locate "New From Friends" section',
            'Verify friend activity displays (if following users)',
            'Tap "New From Friends" to see full screen',
            'Verify friend music activity is shown',
            'Test album navigation from friend activity'
          ]
        },
        {
          description: 'Popular With Friends section',
          steps: [
            'In Home tab, find "Popular With Friends" section',
            'Verify popular albums among friends display',
            'Navigate to full Popular With Friends screen',
            'Verify social music discovery works',
            'Test album details navigation'
          ]
        }
      ]
    },
    {
      name: 'Privacy Controls',
      tests: [
        {
          description: 'Profile privacy settings',
          steps: [
            'Go to Profile → Account Settings → Settings',
            'Toggle "Private Profile" setting',
            'Verify setting is saved',
            'Log out and search for your profile from another account',
            'Verify private profile doesn\'t appear in search'
          ]
        },
        {
          description: 'Activity visibility',
          steps: [
            'With private profile enabled, perform some activities',
            'Check global activity feed from another account',
            'Verify your activities don\'t appear',
            'Switch back to public profile',
            'Verify activities now appear in global feed'
          ]
        },
        {
          description: 'Settings persistence',
          steps: [
            'Change privacy settings',
            'Close and reopen the app',
            'Verify settings are preserved',
            'Test various setting combinations'
          ]
        }
      ]
    },
    {
      name: 'Database & Performance',
      tests: [
        {
          description: 'Data persistence (Schema V2)',
          steps: [
            'Perform various actions (follow, rate albums, add diary entries)',
            'Close the app completely',
            'Reopen the app',
            'Verify all data is preserved in correct V2 tables:',
            '  - album_ratings for ratings',
            '  - album_listens for listen status', 
            '  - diary_entries for diary',
            '  - user_activities for activity feed',
            'Check that relationships are maintained'
          ]
        },
        {
          description: 'Performance benchmarks',
          steps: [
            'Test search response time (should be <2 seconds)',
            'Test feed loading time (should be <3 seconds)',
            'Test navigation between screens (should be smooth)',
            'Monitor app memory usage during extended use'
          ]
        },
        {
          description: 'Error handling',
          steps: [
            'Test with poor network connection',
            'Verify error messages are user-friendly',
            'Test recovery when connection returns',
            'Verify app doesn\'t crash with network errors'
          ]
        }
      ]
    }
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  
  for (const feature of features) {
    const result = await validateFeature(feature.name, feature.tests);
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.total;
  }
  
  // Final results
  colorLog(colors.magenta, '\n' + '='.repeat(60));
  colorLog(colors.bright, '🏁 FINAL VALIDATION RESULTS');
  colorLog(colors.magenta, '='.repeat(60));
  
  console.log(`\n📊 Overall Results:`);
  console.log(`   Total Tests: ${totalTests}`);
  colorLog(colors.green, `   Passed: ${totalPassed}`);
  colorLog(colors.red, `   Failed: ${totalFailed}`);
  
  const successRate = Math.round((totalPassed / totalTests) * 100);
  console.log(`   Success Rate: ${successRate}%`);
  
  if (successRate >= 95) {
    colorLog(colors.green, '\n🎉 STAGING VALIDATION PASSED!');
    colorLog(colors.green, '✅ Ready for Week 6 (Performance & Polish)');
  } else if (successRate >= 80) {
    colorLog(colors.yellow, '\n⚠️  STAGING VALIDATION PARTIAL');
    colorLog(colors.yellow, '🔧 Address failed tests before proceeding');
  } else {
    colorLog(colors.red, '\n❌ STAGING VALIDATION FAILED');
    colorLog(colors.red, '🚨 Significant issues need to be resolved');
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Fix any failed tests');
  console.log('2. Re-run validation for failed features');
  console.log('3. Document any known issues');
  console.log('4. Proceed to Week 6 when validation passes');
  
  rl.close();
}

// Error handling
process.on('SIGINT', () => {
  colorLog(colors.yellow, '\n\n⚠️  Validation interrupted by user');
  rl.close();
  process.exit(0);
});

// Run the validation
main().catch((error) => {
  colorLog(colors.red, `\n❌ Validation script error: ${error.message}`);
  rl.close();
  process.exit(1);
});