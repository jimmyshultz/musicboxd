// Test script to understand Apple Sign-In name extraction
// This is just for reference - run the actual app to test

console.log('🍎 Testing Apple Sign-In name extraction logic');

// Simulate different Apple responses
const testCases = [
  {
    name: 'Full name provided',
    response: {
      user: 'abc123.def456',
      email: 'jimmy@example.com',
      fullName: { givenName: 'Jimmy', familyName: 'Shultz' },
      identityToken: 'fake.token.here'
    }
  },
  {
    name: 'Only email provided',
    response: {
      user: 'abc123.def456',
      email: 'jimmy.shultz@example.com',
      fullName: null,
      identityToken: 'fake.token.here'
    }
  },
  {
    name: 'Private email relay',
    response: {
      user: 'abc123.def456',
      email: 'apple_abc123@appleid.private',
      fullName: null,
      identityToken: 'fake.token.here'
    }
  },
  {
    name: 'No email or name',
    response: {
      user: 'abc123.def456',
      email: null,
      fullName: null,
      identityToken: 'fake.token.here'
    }
  }
];

// Test the name extraction logic
testCases.forEach(testCase => {
  console.log(`\n--- ${testCase.name} ---`);
  const { email, fullName, user } = testCase.response;
  
  let displayName = 'Apple User';
  
  if (fullName?.givenName || fullName?.familyName) {
    const firstName = fullName.givenName || '';
    const lastName = fullName.familyName || '';
    displayName = `${firstName} ${lastName}`.trim();
    console.log('Using fullName data:', displayName);
  } else if (email && email.includes('@') && !email.includes('appleid.private')) {
    const emailPrefix = email.split('@')[0];
    if (emailPrefix && emailPrefix !== 'apple') {
      displayName = emailPrefix.replace(/[._]/g, ' ');
      console.log('Using email prefix as name:', displayName);
    }
  } else {
    if (displayName === 'Apple User') {
      displayName = `AppleUser${user.substring(0, 8)}`;
      console.log('Using fallback name:', displayName);
    }
  }
  
  // Simulate username generation
  const cleanName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  
  console.log('Final display name:', displayName);
  console.log('Generated base username:', cleanName);
});

console.log('\n🎯 The key is to check what Apple actually provides in the real app!');