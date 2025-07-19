/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/utils/theme';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const currentTheme = isDarkMode ? theme.dark : theme.light;

  return (
    <SafeAreaProvider>
      <ReduxProvider store={store}>
        <PaperProvider theme={currentTheme}>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={currentTheme.colors.surface}
          />
          <AppNavigator />
        </PaperProvider>
      </ReduxProvider>
    </SafeAreaProvider>
  );
}

export default App;
