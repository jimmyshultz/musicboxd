# Week 2: Authentication Integration Setup Instructions

This guide covers the implementation of authentication integration for Musicboxd, connecting the React Native app to the Supabase backend established in Week 1.

## 📋 Prerequisites

- ✅ Week 1 completed: Supabase project setup with database schema
- ✅ React Native development environment configured
- ✅ Supabase credentials configured in `.env` file
- ✅ Google Cloud Console project created (from Week 1)

## 🎯 Week 2 Goals

**Primary Goal**: Connect React Native app to Supabase backend with working authentication

**Key Deliverables:**
- ✅ React Native app connected to Supabase
- ✅ Google Sign-In working on iOS
- ✅ User profile creation and management screens
- ✅ Redux store updated for authentication state
- ✅ Proper session handling and token refresh

---

## 🔧 Step 1: Install Authentication Dependencies

Navigate to your React Native project and install the required packages:

```bash
cd /workspace/Musicboxd
npm install @react-native-google-signin/google-signin
npm install react-native-keychain  # For secure token storage
npm install @react-native-async-storage/async-storage  # For session persistence
```

### iOS-specific setup:
```bash
cd ios && pod install && cd ..
```

## 📱 Step 2: Configure Google Sign-In for iOS

### 2.1 Update iOS Configuration

1. **Open Xcode project**:
   ```bash
   open ios/Musicboxd.xcworkspace
   ```

2. **Add GoogleService-Info.plist**:
   - Download `GoogleService-Info.plist` from your Google Cloud Console project
   - Drag it into your Xcode project under the `Musicboxd` folder
   - Ensure "Add to target" is checked for Musicboxd

3. **Update Info.plist**:
   Add the following to `ios/Musicboxd/Info.plist` (inside the `<dict>` tag):
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLName</key>
       <string>com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID</string>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>YOUR_REVERSED_CLIENT_ID</string>
       </array>
     </dict>
   </array>
   ```
   
   Replace `YOUR_REVERSED_CLIENT_ID` with the value from your `GoogleService-Info.plist`.

### 2.2 Update AppDelegate

Add Google Sign-In initialization to `ios/Musicboxd/AppDelegate.mm`:

```objc
#import <GoogleSignIn/GoogleSignIn.h>

// Add this method
- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [[GIDSignIn sharedInstance] handleURL:url];
}

// Update the didFinishLaunchingWithOptions method
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // ... existing code ...
  
  // Add Google Sign-In configuration
  NSString *path = [[NSBundle mainBundle] pathForResource:@"GoogleService-Info" ofType:@"plist"];
  [GIDSignIn.sharedInstance configureWithPlist:path];
  
  return YES;
}
```

## 🔗 Step 3: Implement Supabase Client Integration

### 3.1 Update Supabase Client Configuration

Verify your Supabase client is properly configured in `src/services/supabase.ts`:

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 3.2 Create Authentication Service

Create `src/services/authService.ts`:

```typescript
import { supabase } from './supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export class AuthService {
  static async signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.idToken!,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  }

  static async signOut() {
    try {
      await GoogleSignin.signOut();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  static onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
}
```

## 🔄 Step 4: Update Redux Store for Authentication

### 4.1 Create Auth Slice

Create `src/store/slices/authSlice.ts`:

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AuthService } from '../../services/authService';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const result = await AuthService.signInWithGoogle();
      return result.user;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.signOut();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signInWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
```

### 4.2 Update Store Configuration

Update `src/store/store.ts` to include the auth slice:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
// ... other imports

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // ... other reducers
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## 📱 Step 5: Create Authentication Screens

### 5.1 Create Login Screen

Create `src/screens/auth/LoginScreen.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { signInWithGoogle } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store/store';

export const LoginScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const handleGoogleSignIn = () => {
    dispatch(signInWithGoogle());
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Welcome to Musicboxd</Title>
          <Paragraph style={styles.subtitle}>
            Discover, rate, and share your music journey
          </Paragraph>
          
          <Button
            mode="contained"
            onPress={handleGoogleSignIn}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            icon="google"
          >
            Continue with Google
          </Button>
          
          {error && (
            <Paragraph style={styles.error}>{error}</Paragraph>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    marginTop: 20,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
});
```

### 5.2 Create Profile Management Screen

Create `src/screens/profile/ProfileSetupScreen.tsx`:

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Avatar, Card, Title } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { supabase } from '../../services/supabase';

export const ProfileSetupScreen = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          username,
          bio,
          avatar_url: user.user_metadata?.avatar_url,
          email: user.email,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      // Navigate to main app
      console.log('Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Set Up Your Profile</Title>
          
          <View style={styles.avatarContainer}>
            <Avatar.Image
              size={80}
              source={{ uri: user?.user_metadata?.avatar_url }}
            />
          </View>

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            placeholder="Choose a unique username"
          />

          <TextInput
            label="Bio (Optional)"
            value={bio}
            onChangeText={setBio}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="Tell us about your music taste..."
          />

          <Button
            mode="contained"
            onPress={handleSaveProfile}
            loading={isLoading}
            disabled={isLoading || !username.trim()}
            style={styles.button}
          >
            Complete Setup
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 20,
  },
});
```

## 🔄 Step 6: Initialize Authentication State

### 6.1 Create Auth Provider Component

Create `src/providers/AuthProvider.tsx`:

```typescript
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthService } from '../services/authService';
import { setUser } from '../store/slices/authSlice';
import { AppDispatch } from '../store/store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      iosClientId: 'YOUR_IOS_CLIENT_ID', // From GoogleService-Info.plist
      webClientId: 'YOUR_WEB_CLIENT_ID', // From Google Cloud Console
    });

    // Check for existing session
    const checkSession = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        dispatch(setUser(user));
      } catch (error) {
        console.error('Session check error:', error);
        dispatch(setUser(null));
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: authListener } = AuthService.onAuthStateChange((user) => {
      dispatch(setUser(user));
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
};
```

### 6.2 Update App.tsx

Wrap your app with the AuthProvider:

```typescript
import React from 'react';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { store } from './src/store/store';
import { AuthProvider } from './src/providers/AuthProvider';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <PaperProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </Provider>
  );
}
```

## 🧭 Step 7: Update Navigation for Authentication

### 7.1 Create Authentication Navigator

Create `src/navigation/AuthNavigator.tsx`:

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ProfileSetupScreen } from '../screens/profile/ProfileSetupScreen';

const Stack = createStackNavigator();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
};
```

### 7.2 Update Main App Navigator

Update `src/navigation/AppNavigator.tsx` to handle authentication state:

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator'; // Your existing main navigation
import { ActivityIndicator, View } from 'react-native';

export const AppNavigator = () => {
  const { user, isLoading, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
```

## 🧪 Step 8: Test Authentication Flow

### 8.1 Manual Testing Checklist

1. **Start the app**:
   ```bash
   npm run ios
   ```

2. **Test Google Sign-In**:
   - ✅ Tap "Continue with Google" button
   - ✅ Google sign-in flow opens
   - ✅ After successful sign-in, user is authenticated
   - ✅ App navigates to profile setup or main app

3. **Test Profile Creation**:
   - ✅ Profile setup screen appears for new users
   - ✅ Username and bio can be entered
   - ✅ Profile saves to Supabase database
   - ✅ App navigates to main interface

4. **Test Session Persistence**:
   - ✅ Close and reopen app
   - ✅ User remains logged in
   - ✅ No need to sign in again

5. **Test Sign Out**:
   - ✅ Sign out function works
   - ✅ Returns to login screen
   - ✅ Session is cleared from storage

### 8.2 Database Verification

Check your Supabase dashboard:
1. **Go to Authentication** → **Users** tab
2. **Verify new users appear** after sign-in
3. **Go to Table Editor** → **user_profiles**
4. **Verify profile data** is saved correctly

## 🔒 Step 9: Security Implementation

### 9.1 Secure Token Storage

Verify secure storage is working:

```typescript
// In your auth service, tokens should be stored securely
import * as Keychain from 'react-native-keychain';

export const secureStorage = {
  async setItem(key: string, value: string) {
    await Keychain.setInternetCredentials(key, key, value);
  },
  
  async getItem(key: string) {
    try {
      const credentials = await Keychain.getInternetCredentials(key);
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  },
  
  async removeItem(key: string) {
    await Keychain.resetInternetCredentials(key);
  },
};
```

### 9.2 Implement Session Refresh

Ensure automatic token refresh is working:

```typescript
// This should be handled automatically by Supabase client
// Verify in your auth service that autoRefreshToken is enabled
```

## 🚨 Troubleshooting

### Common Issues:

1. **Google Sign-In not working**:
   - ✅ Verify `GoogleService-Info.plist` is added to Xcode project
   - ✅ Check that bundle ID matches Google Cloud Console configuration
   - ✅ Ensure reversed client ID is correctly added to Info.plist

2. **Supabase connection errors**:
   - ✅ Verify environment variables are correctly set
   - ✅ Check that Supabase project is active (not paused)
   - ✅ Confirm API keys are valid

3. **Redux state not updating**:
   - ✅ Verify auth slice is added to store configuration
   - ✅ Check that AuthProvider is wrapping the app
   - ✅ Ensure dispatch calls are using correct action creators

4. **Profile creation failing**:
   - ✅ Verify database schema includes user_profiles table
   - ✅ Check RLS policies allow authenticated users to insert
   - ✅ Confirm user ID is being passed correctly

5. **Session not persisting**:
   - ✅ Verify AsyncStorage is properly configured
   - ✅ Check that persistSession is enabled in Supabase client
   - ✅ Ensure auth state listener is set up correctly

## 📊 Week 2 Testing Checklist

Before marking Week 2 complete, verify:

- [ ] Google Sign-In works on iOS device/simulator
- [ ] User profiles are created and stored in Supabase
- [ ] Authentication state persists across app restarts
- [ ] Sign out functionality works properly
- [ ] Redux store properly manages auth state
- [ ] Navigation correctly shows auth vs main app screens
- [ ] No console errors related to authentication
- [ ] Database RLS policies allow proper user access

## 📈 Success Metrics

**Week 2 is complete when:**
- ✅ Users can sign up and log in with Google accounts
- ✅ User profiles persist across app restarts  
- ✅ Authentication state properly managed in Redux
- ✅ All authentication flows work without errors
- ✅ Session handling and token refresh working

## 🔄 Next Steps - Week 3 Preview

Once Week 2 is complete, Week 3 will focus on:
- Spotify API integration to replace mock data
- Real album search functionality
- Album detail pages with Spotify metadata

---

**🎯 Week 2 Deliverable Status**: ⏸️ In Progress
- React Native Supabase connection ⏸️
- Google Sign-In implementation ⏸️ 
- User profile management ⏸️
- Redux authentication state ⏸️
- Session handling ⏸️