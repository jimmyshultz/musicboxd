import { supabase } from './supabase';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { userService } from './userService';

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
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
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
   * Sign out user
   */
  static async signOut() {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      
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