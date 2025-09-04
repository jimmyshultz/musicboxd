/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { lightTheme, darkTheme } from './src/utils/theme';
import { AuthProvider } from './src/providers/AuthProvider';
import { quickValidation } from './src/utils/spotifyValidation';
import ErrorBoundary from './src/components/ErrorBoundary';
import { Environment } from './src/config/environment';

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  // Validate Spotify integration on app startup
  useEffect(() => {
    const { configured } = quickValidation();
    if (!configured) {
      console.warn('⚠️ Spotify API not configured - using fallback data. See SPOTIFY_SETUP.md for setup.');
    }
    
    // TEMPORARY: Log environment detection
    console.log('🌍 Environment Check:', {
      current: Environment.current,
      isDev: Environment.isDevelopment,
      isStaging: Environment.isStaging,
      isProd: Environment.isProduction
    });
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider 
        theme={currentTheme}
      >
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={currentTheme.colors.surface}
        />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <AppContent />
      </ReduxProvider>
    </ErrorBoundary>
  );
}

export default App;