import { supabase } from './supabase';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { userService } from './userService';

export class AuthService {
  /**
   * Initialize Google Sign-In configuration
   * Call this once when the app starts
   */
  static initializeGoogleSignIn() {
    GoogleSignin.configure({
      // Using your actual client IDs from Google Cloud Console
      iosClientId: '148204198310-f563ltpvfnibugfc3e3c9quaupnejb17.apps.googleusercontent.com', // iOS client ID
      webClientId: '148204198310-jb85bku6g5sdoggvt6idqq3j31momvl7.apps.googleusercontent.com', // Web client ID
      offlineAccess: true, // Enable offline access to get refresh token
      scopes: ['openid', 'profile', 'email'], // Explicitly request required scopes
      forceCodeForRefreshToken: true, // Force code for refresh token
    });
  }

  /**
   * Sign in with Google
   */
  static async signInWithGoogle() {
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Get user info from Google
      const userInfo = await GoogleSignin.signIn();
      
      // Debug: Log the entire userInfo object
      console.log('Google Sign-In userInfo:', JSON.stringify(userInfo, null, 2));
      
      // Also show an alert for debugging (remove this later)
      // Alert.alert('Debug', `idToken: ${!!userInfo.idToken}, accessToken: ${!!userInfo.accessToken}`);
      
      // Extract token from the correct location in the response
      let token = userInfo.data?.idToken || userInfo.idToken || userInfo.data?.accessToken || userInfo.accessToken;
      
      if (!token) {
        console.error('No token found in userInfo:', userInfo);
        throw new Error('No authentication token received from Google');
      }

      console.log('Using token:', token.substring(0, 50) + '...');

      // Sign in to Supabase using Google token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: token,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      console.log('Supabase auth successful:', data.user?.email);

      // Check if user profile exists, create if not
      if (data.user) {
        let profile = await userService.getUserProfile(data.user.id);
        
        if (!profile) {
          // Extract user data from the correct location
          const googleUser = userInfo.data?.user || userInfo.user;
          
          // Create new user profile
          profile = await userService.createUserProfile({
            id: data.user.id,
            username: googleUser.name || `user_${Date.now()}`,
            email: googleUser.email,
            bio: '',
            avatar_url: googleUser.photo || '',
            is_private: false,
          });
          console.log('Created new user profile:', profile.username);
        } else {
          console.log('Found existing user profile:', profile.username);
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