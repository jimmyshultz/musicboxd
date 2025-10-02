/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useAppTheme } from './src/providers/ThemeProvider';
import { AuthProvider } from './src/providers/AuthProvider';
import { quickValidation } from './src/utils/spotifyValidation';
import ErrorBoundary from './src/components/ErrorBoundary';
import { Environment } from './src/config/environment';
import { suppressConsoleForBetaUsers } from './src/utils/consoleSuppression';

// Suppress console output for beta users immediately
suppressConsoleForBetaUsers();

function AppContent() {
  const { theme, isDark } = useAppTheme();

  // Validate Spotify integration on app startup
  useEffect(() => {
    // Disable React Native error overlays for beta testers
    if (Environment.isStaging || Environment.isProduction) {
      LogBox.ignoreAllLogs(true);
    }
    
    // Validate Spotify integration (only logs in development now)
    const { configured } = quickValidation();
    if (!configured && Environment.isDevelopment) {
      console.warn('⚠️ Spotify API not configured - using fallback data. See SPOTIFY_SETUP.md for setup.');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

export default App;