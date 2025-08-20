import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { AuthService } from '../services/authService';
import { initializeAuth } from '../store/slices/authSlice';

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

    // Set up auth state listener for real-time updates
    const { data: authListener } = AuthService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Handle sign out
        dispatch(initializeAuth());
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Handle sign in or token refresh
        dispatch(initializeAuth());
      }
    });

    return () => {
      // Cleanup the auth listener
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [dispatch]);

  return <>{children}</>;
};