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
import { loginSuccess } from './src/store/slices/authSlice';

// Mock user data
const mockUser = {
  id: 'user_001',
  username: 'musiclover2024',
  email: 'user@example.com',
  fullName: 'Music Lover',
  bio: 'Passionate about discovering new music',
  profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
  joinedDate: '2024-01-15T00:00:00.000Z',
  lastActiveDate: new Date().toISOString(),
  preferences: {
    favoriteGenres: ['Rock', 'Electronic', 'Jazz'],
    favoriteAlbumIds: ['album_001', 'album_002', 'album_003'],
  },
  privacy: {
    profileVisibility: 'public' as const,
    listenHistoryVisibility: 'public' as const,
    reviewsVisibility: 'public' as const,
  },
};

function AppContent() {
  const dispatch = useDispatch();
  const isDarkMode = useColorScheme() === 'dark';
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    // Auto-login mock user on app start (until real auth is implemented)
    dispatch(loginSuccess(mockUser));
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