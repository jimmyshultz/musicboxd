import React, { useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useThemeColors } from '../providers/ThemeProvider';

export const AppleSignInDebug: React.FC = () => {
  const colors = useThemeColors();
  useEffect(() => {
    console.log('🍎 [DEBUG] AppleSignInDebug: Component mounted');
    console.log('🍎 [DEBUG] AppleSignInDebug: Platform.OS:', Platform.OS);
    
    // Test direct import
    try {
      console.log('🍎 [DEBUG] AppleSignInDebug: Testing direct import...');
      const appleModule = require('@invertase/react-native-apple-authentication');
      console.log('🍎 [DEBUG] AppleSignInDebug: Direct import successful!');
      console.log('🍎 [DEBUG] AppleSignInDebug: Module keys:', Object.keys(appleModule));
      console.log('🍎 [DEBUG] AppleSignInDebug: appleAuth type:', typeof appleModule.appleAuth);
      console.log('🍎 [DEBUG] AppleSignInDebug: AppleButton type:', typeof appleModule.AppleButton);
      
      if (appleModule.appleAuth) {
        console.log('🍎 [DEBUG] AppleSignInDebug: appleAuth methods:', Object.keys(appleModule.appleAuth));
      }
      
      if (appleModule.AppleButton) {
        console.log('🍎 [DEBUG] AppleSignInDebug: AppleButton properties:', Object.keys(appleModule.AppleButton));
      }
    } catch (error) {
      console.log('🍎 [DEBUG] AppleSignInDebug: Direct import failed:', error);
    }
    
    // Test package.json presence
    try {
      const packageJson = require('../../package.json');
      const appleDep = packageJson.dependencies['@invertase/react-native-apple-authentication'];
      console.log('🍎 [DEBUG] AppleSignInDebug: Package.json dependency version:', appleDep);
    } catch (error) {
      console.log('🍎 [DEBUG] AppleSignInDebug: Could not read package.json:', error);
    }
    
    // Test node_modules presence
    try {
      console.log('🍎 [DEBUG] AppleSignInDebug: Checking node_modules...');
      // This might not work in React Native, but let's try
    } catch (error) {
      console.log('🍎 [DEBUG] AppleSignInDebug: Could not check filesystem:', error);
    }
  }, []);

  if (Platform.OS !== 'ios') {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      padding: 10,
      backgroundColor: colors.surfaceVariant,
      margin: 10,
    },
    text: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        🍎 Apple Sign-In Debug Component (Check console for detailed logs)
      </Text>
    </View>
  );
};

export default AppleSignInDebug;