import { supabase } from './supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { userService } from './userService';

// Safely import Apple Authentication with fallback
let appleAuth: any = null;
try {
  console.log('🍎 [DEBUG] Attempting to import Apple Authentication library...');
  const appleAuthModule = require('@invertase/react-native-apple-authentication');
  console.log('🍎 [DEBUG] Apple Authentication module imported:', Object.keys(appleAuthModule));
  appleAuth = appleAuthModule.appleAuth;
  console.log('🍎 [DEBUG] appleAuth object:', typeof appleAuth, appleAuth ? 'available' : 'null');
} catch (error) {
  console.log('🍎 [DEBUG] Apple Authentication library import failed:', error.message);
  console.log('🍎 [DEBUG] Full error:', error);
}

export class AuthService {
  /**
   * Generate a unique username from a display name
   * Format: firstnamelastname, firstnamelastname2, firstnamelastname3, etc.
   */
  static async generateUniqueUsername(displayName: string): Promise<string> {
    // Clean the display name: remove spaces, special chars, convert to lowercase
    const cleanName = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
      .substring(0, 20); // Limit length
    
    let baseUsername = cleanName || 'user';
    let username = baseUsername;
    let counter = 1;
    
    // Keep trying until we find a unique username
    while (true) {
      try {
        // Check if username is available
        const isAvailable = await userService.isUsernameAvailable(username);
        if (isAvailable) {
          console.log('Generated unique username:', username);
          return username;
        }
        
        // Username taken, try with number suffix
        counter++;
        username = `${baseUsername}${counter}`;
        
        // Safety check to prevent infinite loop
        if (counter > 1000) {
          // Fallback to timestamp-based username
          return `${baseUsername}_${Date.now()}`;
        }
      } catch (error) {
        console.error('Error checking username availability:', error);
        // Fallback to timestamp-based username
        return `${baseUsername}_${Date.now()}`;
      }
    }
  }

  /**
   * Initialize Google Sign-In configuration
   * Call this once when the app starts
   */
  static initializeGoogleSignIn() {
    GoogleSignin.configure({
      // Using your actual client IDs from Google Cloud Console
      iosClientId: '148204198310-f563ltpvfnibugfc3e3c9quaupnejb17.apps.googleusercontent.com', // iOS client ID
      webClientId: '148204198310-jb85bku6g5sdoggvt6idqq3j31momvl7.apps.googleusercontent.com', // Web client ID
      offlineAccess: false, // Try without offline access to avoid nonce
      scopes: ['openid', 'profile', 'email'], // Explicitly request required scopes
    });
  }

  /**
   * Sign in with Google - Hybrid approach
   * Use React Native Google Sign-In for UX, then create Supabase user manually
   */
  static async signInWithGoogle() {
    try {
      console.log('Starting hybrid Google Sign-In approach...');
      
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Get user info from Google
      const userInfo = await GoogleSignin.signIn();
      
      // Debug: Log the entire userInfo object
      console.log('Google Sign-In userInfo:', JSON.stringify(userInfo, null, 2));
      
      // Extract user data from the correct location
      const googleUser = userInfo.data?.user || userInfo.user;
      
      if (!googleUser || !googleUser.email) {
        throw new Error('No user data received from Google');
      }

      console.log('Google Sign-In successful, creating Supabase user...');

      // Instead of using signInWithIdToken, let's create/sign in the user directly
      // This bypasses all the nonce issues
      
      // First, try to sign up the user (this will fail if they already exist)
      const { error: signUpError } = await supabase.auth.signUp({
        email: googleUser.email,
        password: `google_oauth_${googleUser.id}`, // Use Google ID as password
        options: {
          data: {
            name: googleUser.name,
            avatar_url: googleUser.photo,
            provider: 'google',
          },
        },
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        throw signUpError;
      }

      // Now sign in the user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: googleUser.email,
        password: `google_oauth_${googleUser.id}`,
      });

      if (error) {
        console.error('Supabase sign-in error:', error);
        throw error;
      }

      console.log('Supabase auth successful:', data.user?.email);

      // Check if user profile exists, create if not
      if (data.user) {
        let profile = await userService.getUserProfile(data.user.id);
        
        if (!profile) {
          // Generate a unique username
          const uniqueUsername = await this.generateUniqueUsername(googleUser.name || 'User');
          
          // Create new user profile
          profile = await userService.upsertUserProfile({
            id: data.user.id,
            username: uniqueUsername,
            bio: '',
            avatar_url: googleUser.photo || '',
            is_private: false,
            created_at: new Date().toISOString(),
          });
          console.log('Created new user profile:', profile.username);
        } else {
          console.log('Found existing user profile:', profile.username);
          
          // Update existing profile with Google data if needed (but keep existing username)
          if (profile.avatar_url !== googleUser.photo) {
            console.log('Updating profile avatar...');
            profile = await userService.updateUserProfile(data.user.id, {
              avatar_url: googleUser.photo || profile.avatar_url,
            });
            console.log('Updated user avatar');
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  }

  /**
   * Sign in with Apple
   * Uses Apple's native authentication and creates Supabase user
   */
  static async signInWithApple() {
    try {
      console.log('Starting Apple Sign-In...');
      
      // Check if Apple Auth is properly loaded
      if (!appleAuth) {
        throw new Error('Apple Authentication library not imported. Please check the installation.');
      }
      
      if (!appleAuth.native) {
        throw new Error('Apple Authentication native module not linked. The app needs to be rebuilt after pod install.');
      }
      
      if (typeof appleAuth.performRequest !== 'function') {
        throw new Error('Apple Authentication performRequest method not available. Please rebuild the app.');
      }
      
      // Perform the Apple Sign-In request
      console.log('🍎 [DEBUG] Requesting Apple Sign-In with scopes: EMAIL, FULL_NAME');
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      console.log('🍎 [DEBUG] Apple Sign-In response:', {
        user: appleAuthRequestResponse.user,
        email: appleAuthRequestResponse.email,
        fullName: appleAuthRequestResponse.fullName,
        hasIdentityToken: !!appleAuthRequestResponse.identityToken,
      });

      // Ensure we have the required data
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('Apple Sign-In failed - no identity token received');
      }

      // Extract user information
      const { identityToken, email, fullName } = appleAuthRequestResponse;
      
      console.log('🍎 [DEBUG] Full Apple response data:', {
        email,
        fullName,
        givenName: fullName?.givenName,
        familyName: fullName?.familyName,
      });
      
      // Create a display name from fullName if available
      let displayName = 'Apple User';
      
      // Try multiple ways to get the name
      if (fullName?.givenName || fullName?.familyName) {
        const firstName = fullName.givenName || '';
        const lastName = fullName.familyName || '';
        displayName = `${firstName} ${lastName}`.trim();
        console.log('🍎 [DEBUG] Using fullName data:', displayName);
      } else if (email && email.includes('@') && !email.includes('appleid.private')) {
        // If we have a real email, try to extract name from it
        const emailPrefix = email.split('@')[0];
        if (emailPrefix && emailPrefix !== 'apple') {
          displayName = emailPrefix.replace(/[._]/g, ' ');
          console.log('🍎 [DEBUG] Using email prefix as name:', displayName);
        }
      } else {
        console.log('🍎 [DEBUG] No name data available, trying to decode identity token');
        
        // Try to decode the identity token to get more info
        try {
          // Decode JWT token (just the payload, we don't need to verify signature)
          const tokenPayload = identityToken.split('.')[1];
          const decodedPayload = JSON.parse(atob(tokenPayload));
          console.log('🍎 [DEBUG] Identity token payload:', decodedPayload);
          
          // Apple sometimes puts name info in the token
          if (decodedPayload.email && !decodedPayload.email.includes('appleid.private')) {
            const emailPrefix = decodedPayload.email.split('@')[0];
            if (emailPrefix && emailPrefix !== 'apple') {
              displayName = emailPrefix.replace(/[._]/g, ' ');
              console.log('🍎 [DEBUG] Using email from token:', displayName);
            }
          }
        } catch (tokenError) {
          console.log('🍎 [DEBUG] Could not decode identity token:', tokenError);
        }
        
        // Final fallback - use a generic but unique identifier
        if (displayName === 'Apple User') {
          displayName = `AppleUser${appleAuthRequestResponse.user.substring(0, 8)}`;
          console.log('🍎 [DEBUG] Using fallback name:', displayName);
        }
      }

      console.log('Apple Sign-In successful, checking for existing user...');

      // Use Apple User ID as the primary identifier for consistent login
      const appleUserId = appleAuthRequestResponse.user;
      const appleEmail = email || `apple_${appleUserId}@appleid.private`;
      const applePassword = `apple_oauth_${appleUserId}`;

      console.log('🍎 [DEBUG] Apple User ID:', appleUserId);
      console.log('🍎 [DEBUG] Using email:', appleEmail);
      console.log('🍎 [DEBUG] Display name:', displayName);

      // Try to sign in first (in case user already exists)
      let authResult = await supabase.auth.signInWithPassword({
        email: appleEmail,
        password: applePassword,
      });

      // If sign-in fails, try to create the user
      if (authResult.error) {
        console.log('User does not exist, creating new account...');
        
        const { error: signUpError } = await supabase.auth.signUp({
          email: appleEmail,
          password: applePassword,
          options: {
            data: {
              name: displayName,
              provider: 'apple',
              apple_user_id: appleUserId,
            },
          },
        });

        if (signUpError && !signUpError.message.includes('already registered')) {
          throw signUpError;
        }

        // Now sign in the newly created user
        authResult = await supabase.auth.signInWithPassword({
          email: appleEmail,
          password: applePassword,
        });
      } else {
        console.log('Found existing user, signed in successfully');
      }

      const { data, error } = authResult;

      if (error) {
        console.error('Supabase sign-in error:', error);
        throw error;
      }

      console.log('Supabase auth successful:', data.user?.email);

      // Check if user profile exists, create if not
      if (data.user) {
        let profile = await userService.getUserProfile(data.user.id);
        
        if (!profile) {
          // Generate a unique username
          const uniqueUsername = await this.generateUniqueUsername(displayName);
          
          // Create new user profile
          profile = await userService.upsertUserProfile({
            id: data.user.id,
            username: uniqueUsername,
            bio: '',
            avatar_url: '',
            is_private: false,
            created_at: new Date().toISOString(),
          });
          console.log('Created new user profile:', profile.username);
        } else {
          console.log('Found existing user profile:', profile.username);
        }
      }

      return data;
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      throw error;
    }
  }

  /**
   * Check if Apple Sign-In is available on the current device
   */
  static async isAppleSignInAvailable(): Promise<boolean> {
    try {
      console.log('🍎 [DEBUG] Checking Apple Sign-In availability...');
      console.log('🍎 [DEBUG] appleAuth object exists:', !!appleAuth);
      console.log('🍎 [DEBUG] appleAuth type:', typeof appleAuth);
      
      if (appleAuth) {
        console.log('🍎 [DEBUG] appleAuth methods:', Object.keys(appleAuth));
        console.log('🍎 [DEBUG] isAvailableAsync exists:', typeof appleAuth.isAvailableAsync);
      }
      
      // Check if the appleAuth module is properly loaded
      if (!appleAuth) {
        console.log('🍎 [DEBUG] Apple Authentication library not imported');
        return false;
      }
      
      // Check if native module is linked by looking for the native property
      if (!appleAuth.native) {
        console.log('🍎 [DEBUG] Apple Authentication native module not linked');
        console.log('🍎 [DEBUG] - appleAuth exists:', !!appleAuth);
        console.log('🍎 [DEBUG] - appleAuth.native exists:', !!appleAuth.native);
        console.log('🍎 [DEBUG] This means pod install worked but app needs rebuild');
        return false;
      }
      
      // Check if isAvailableAsync method exists
      if (typeof appleAuth.isAvailableAsync !== 'function') {
        console.log('🍎 [DEBUG] isAvailableAsync method not available');
        console.log('🍎 [DEBUG] - isAvailableAsync type:', typeof appleAuth.isAvailableAsync);
        console.log('🍎 [DEBUG] - Available methods:', Object.keys(appleAuth));
        
        // Try to check if we're on iOS as a fallback
        const { Platform } = require('react-native');
        if (Platform.OS === 'ios') {
          console.log('🍎 [DEBUG] Fallback: Assuming available on iOS since native module exists');
          return true; // Assume available on iOS if native module exists
        }
        return false;
      }
      
      console.log('🍎 [DEBUG] Calling appleAuth.isAvailableAsync()...');
      const isAvailable = await appleAuth.isAvailableAsync();
      console.log('🍎 [DEBUG] Apple Sign-In availability result:', isAvailable);
      return isAvailable;
    } catch (error) {
      console.error('🍎 [DEBUG] Error checking Apple Sign-In availability:', error);
      return false;
    }
  }

  /**
   * Sign out user
   */
  static async signOut() {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      
      // Note: Apple doesn't require explicit sign-out from their service
      // The user would need to revoke access from their Apple ID settings
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    return user;
  }

  /**
   * Get current session
   */
  static async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return session;
  }

  /**
   * Listen to authentication state changes
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Refresh the current session
   */
  static async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Check if user is currently signed in
   */
  static async isSignedIn(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      return !!session?.user;
    } catch {
      return false;
    }
  }
}