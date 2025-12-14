/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, LogBox } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { lightTheme, darkTheme } from './src/utils/theme';
import { AuthProvider } from './src/providers/AuthProvider';
import { NotificationProvider } from './src/providers/NotificationProvider';
import { quickValidation } from './src/utils/spotifyValidation';
import ErrorBoundary from './src/components/ErrorBoundary';
import { Environment } from './src/config/environment';
import { suppressConsoleForBetaUsers } from './src/utils/consoleSuppression';
import { initializeCrashAnalytics } from './src/services/crashAnalytics';
import { initializeAdMob } from './src/services/adMobService';
import { initializeNotificationService } from './src/services/notificationService';

// Suppress console output for beta users immediately
suppressConsoleForBetaUsers();

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  // Initialize app services and validate integrations
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize crash analytics (handles Firebase internally)
        await initializeCrashAnalytics();
        
        // Initialize notification service (must be before AdMob to ensure early loading)
        await initializeNotificationService();
        
        // Initialize AdMob
        await initializeAdMob();
        
        // Disable React Native error overlays for beta testers
        if (Environment.isStaging || Environment.isProduction) {
          LogBox.ignoreAllLogs(true);
        }
        
        // Validate Spotify integration (only logs in development now)
        const { configured } = quickValidation();
        if (!configured && Environment.isDevelopment) {
          console.warn('⚠️ Spotify API not configured - using fallback data. See SPOTIFY_SETUP.md for setup.');
        }
      } catch (error) {
        console.error('Failed to initialize app services:', error);
      }
    };

    initializeApp();
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
          <NotificationProvider>
            <AppNavigator />
          </NotificationProvider>
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