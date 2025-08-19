/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { lightTheme, darkTheme } from './src/utils/theme';
import { loginSuccess, loginFailure } from './src/store/slices/authSlice';
import { userService } from './src/services/userService';
import { supabase } from './src/services/supabase';

function AppContent() {
  const dispatch = useDispatch();
  const isDarkMode = useColorScheme() === 'dark';
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    // Initialize Supabase authentication
    const initializeAuth = async () => {
      try {
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is logged in, get their profile
          const profile = await userService.getCurrentUserProfile();
          
          if (profile) {
            // Convert profile to user format expected by Redux
            const user = {
              id: profile.id,
              username: profile.username,
              email: session.user.email || '',
              bio: profile.bio || '',
              profilePicture: profile.avatar_url || '',
              joinedDate: profile.created_at,
              lastActiveDate: new Date().toISOString(),
              preferences: {
                favoriteGenres: [],
                favoriteAlbumIds: [],
                notifications: {
                  newFollowers: true,
                  reviewLikes: true,
                  friendActivity: true,
                },
                privacy: {
                  profileVisibility: profile.is_private ? 'private' as const : 'public' as const,
                  activityVisibility: profile.is_private ? 'private' as const : 'public' as const,
                },
              },
            };
            
            dispatch(loginSuccess(user));
          }
        } else {
          // No active session - for now, create a temporary mock user for development
          // TODO: Implement proper login screen
          console.log('No active session - user needs to log in');
          
          // For development, create a temporary mock user with a proper UUID format
          const tempUser = {
            id: '00000000-0000-0000-0000-000000000000', // Valid UUID format
            username: 'temp_user',
            email: 'temp@example.com',
            bio: 'Temporary user for development',
            profilePicture: '',
            joinedDate: new Date().toISOString(),
            lastActiveDate: new Date().toISOString(),
            preferences: {
              favoriteGenres: ['Rock', 'Electronic'],
              favoriteAlbumIds: [],
              notifications: {
                newFollowers: true,
                reviewLikes: true,
                friendActivity: true,
              },
              privacy: {
                profileVisibility: 'public' as const,
                activityVisibility: 'public' as const,
              },
            },
          };
          
          dispatch(loginSuccess(tempUser));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        dispatch(loginFailure('Failed to initialize authentication'));
      }
    };

    initializeAuth();
  }, [dispatch]);

  return (
    <SafeAreaProvider>
      <PaperProvider 
        theme={currentTheme}
      >
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={currentTheme.colors.surface}
        />
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <ReduxProvider store={store}>
      <AppContent />
    </ReduxProvider>
  );
}

export default App;