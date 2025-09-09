import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Button,
} from 'react-native-paper';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { signInWithGoogle, signInWithApple } from '../../store/slices/authSlice';
import { AuthService } from '../../services/authService';
import { theme, spacing } from '../../utils/theme';
import AppleSignInDebug from '../../components/AppleSignInDebug';

// Safely import Apple Button with fallback
let AppleButton: any = null;
try {
  console.log('🍎 [DEBUG] AuthScreen: Attempting to import AppleButton...');
  const appleAuthModule = require('@invertase/react-native-apple-authentication');
  console.log('🍎 [DEBUG] AuthScreen: Apple Auth module keys:', Object.keys(appleAuthModule));
  AppleButton = appleAuthModule.AppleButton;
  console.log('🍎 [DEBUG] AuthScreen: AppleButton imported:', typeof AppleButton, AppleButton ? 'available' : 'null');
} catch (error) {
  console.log('🍎 [DEBUG] AuthScreen: Apple Authentication UI components not available:', error.message);
}

export default function AuthScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);

  useEffect(() => {
    // Check if Apple Sign-In is available on this device
    const checkAppleSignInAvailability = async () => {
      try {
        console.log('🍎 [DEBUG] AuthScreen: Starting Apple Sign-In availability check...');
        console.log('🍎 [DEBUG] AuthScreen: Platform.OS:', Platform.OS);
        console.log('🍎 [DEBUG] AuthScreen: AppleButton available:', !!AppleButton);
        
        const available = await AuthService.isAppleSignInAvailable();
        console.log('🍎 [DEBUG] AuthScreen: Apple Sign-In availability result:', available);
        setIsAppleSignInAvailable(available);
        
        console.log('🍎 [DEBUG] AuthScreen: State updated - isAppleSignInAvailable:', available);
      } catch (error) {
        console.log('🍎 [DEBUG] AuthScreen: Error checking Apple Sign-In availability:', error);
        setIsAppleSignInAvailable(false);
      }
    };

    checkAppleSignInAvailability();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await dispatch(signInWithGoogle()).unwrap();
    } catch (signInError: any) {
      Alert.alert(
        'Sign In Failed',
        signInError.message || 'An error occurred during sign in. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await dispatch(signInWithApple()).unwrap();
    } catch (signInError: any) {
      Alert.alert(
        'Sign In Failed',
        signInError.message || 'An error occurred during Apple sign in. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <AppleSignInDebug />
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Resonare
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Track, Rate, Discover
        </Text>
        
        <Card style={styles.authCard} elevation={2}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.welcomeText}>
              Welcome to your music journey!
            </Text>
            <Text variant="bodySmall" style={styles.description}>
              Sign up to track your listening history, rate albums, and connect with fellow music lovers.
            </Text>
          </Card.Content>
        </Card>
        
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <View style={styles.buttonContainer}>
            <GoogleSigninButton
              style={styles.googleButton}
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Dark}
              onPress={handleGoogleSignIn}
              disabled={loading}
            />
            
            {/* Show Apple Sign-In button only on iOS and when available */}
            {Platform.OS === 'ios' && isAppleSignInAvailable && AppleButton && (
              <>
                {console.log('🍎 [DEBUG] AuthScreen: Rendering Apple Sign-In button')}
                <AppleButton
                  buttonStyle={AppleButton.Style.BLACK}
                  buttonType={AppleButton.Type.SIGN_IN}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                />
              </>
            )}
            
            {/* Debug info for Apple Sign-In */}
            {Platform.OS === 'ios' && (
              <>
                {console.log('🍎 [DEBUG] AuthScreen: Render conditions:')}
                {console.log('🍎 [DEBUG] - Platform.OS === "ios":', Platform.OS === 'ios')}
                {console.log('🍎 [DEBUG] - isAppleSignInAvailable:', isAppleSignInAvailable)}
                {console.log('🍎 [DEBUG] - AppleButton exists:', !!AppleButton)}
                {console.log('🍎 [DEBUG] - Should show button:', Platform.OS === 'ios' && isAppleSignInAvailable && AppleButton)}
              </>
            )}
            
            {/* Show helpful message when Apple Sign-In is not available but should be */}
            {Platform.OS === 'ios' && !AppleButton && (
              <>
                {console.log('🍎 [DEBUG] AuthScreen: Showing fallback message')}
                <Text variant="bodySmall" style={styles.infoText}>
                  Apple Sign-In will be available after running: cd ios && pod install
                </Text>
              </>
            )}
          </View>
        )}
        
        {error && (
          <Text variant="bodySmall" style={styles.errorText}>
            {error}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  authCard: {
    width: '100%',
    marginBottom: spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  welcomeText: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  errorText: {
    textAlign: 'center',
    color: theme.colors.error,
    marginTop: spacing.md,
  },
  description: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  googleButton: {
    width: '100%',
    height: 48,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  infoText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: spacing.sm,
    fontSize: 12,
  },
});