import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { AuthService } from '../services/authService';
import { initializeAuth } from '../store/slices/authSlice';
import { supabase } from '../services/supabase';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initialize Google Sign-In configuration
    AuthService.initializeGoogleSignIn();

    // Initialize authentication state
    dispatch(initializeAuth());

    // Set up URL handling for OAuth callbacks
    const handleDeepLink = (url: string) => {
      console.log('Received deep link:', url);
      if (url.includes('auth/callback')) {
        // Let Supabase handle the OAuth callback
        supabase.auth.getSessionFromUrl({ url });
      }
    };

    // Listen for deep links
    const linkingListener = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened with a deep link
    Linking.getInitialURL()
      .then(url => {
        if (url) {
          handleDeepLink(url);
        }
      })
      .catch(error => {
        console.warn('Error getting initial URL:', error);
      });

    // Set up auth state listener for real-time updates
    const { data: authListener } = AuthService.onAuthStateChange(
      (event, _session) => {
        if (event === 'SIGNED_OUT') {
          // Handle sign out
          dispatch(initializeAuth());
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Handle sign in or token refresh
          dispatch(initializeAuth());
        }
      },
    );

    return () => {
      // Cleanup listeners
      linkingListener?.remove();
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [dispatch]);

  return <>{children}</>;
};
