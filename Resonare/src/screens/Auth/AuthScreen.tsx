import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { signInWithGoogle, signInWithApple } from '../../store/slices/authSlice';
import { AuthService } from '../../services/authService';
import { spacing } from '../../utils/theme';
// import AppleSignInDebug from '../../components/AppleSignInDebug'; // Removed - Apple Sign-In working

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
      } catch (availabilityError) {
        console.log('🍎 [DEBUG] AuthScreen: Error checking Apple Sign-In availability:', availabilityError);
        setIsAppleSignInAvailable(false);
      }
    };

    checkAppleSignInAvailability();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔍 [DEBUG] AuthScreen: handleGoogleSignIn called');
      console.log('🔍 [DEBUG] AuthScreen: About to dispatch signInWithGoogle');
      await dispatch(signInWithGoogle()).unwrap();
      console.log('🔍 [DEBUG] AuthScreen: signInWithGoogle completed successfully');
    } catch (signInError: any) {
      console.log('🔍 [DEBUG] AuthScreen: signInWithGoogle failed:', signInError);
      console.log('🔍 [DEBUG] AuthScreen: Error message:', signInError.message);
      console.log('🔍 [DEBUG] AuthScreen: Full error object:', JSON.stringify(signInError, null, 2));
      Alert.alert(
        'Sign In Failed',
        signInError.message || 'An error occurred during sign in. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAppleSignIn = async () => {
    try {
      console.log('🍎 [DEBUG] AuthScreen: handleAppleSignIn called');
      console.log('🍎 [DEBUG] AuthScreen: About to dispatch signInWithApple');
      await dispatch(signInWithApple()).unwrap();
      console.log('🍎 [DEBUG] AuthScreen: signInWithApple completed successfully');
    } catch (signInError: any) {
      console.log('🍎 [DEBUG] AuthScreen: signInWithApple failed:', signInError);
      console.log('🍎 [DEBUG] AuthScreen: Error message:', signInError.message);
      console.log('🍎 [DEBUG] AuthScreen: Full error object:', JSON.stringify(signInError, null, 2));
      Alert.alert(
        'Sign In Failed',
        signInError.message || 'An error occurred during Apple sign in. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
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
            <TouchableOpacity
              style={[styles.signInButton, styles.googleButton, loading && styles.disabledButton]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <View style={styles.buttonContent}>
                <View style={styles.googleIconContainer}>
                  <View style={styles.googleIconBg}>
                    <Text style={styles.googleIcon}>G</Text>
                  </View>
                </View>
                <Text style={[styles.buttonText, styles.googleButtonText]}>
                  Continue with Google
                </Text>
              </View>
            </TouchableOpacity>
            
            {/* Show Apple Sign-In button only on iOS and when available */}
            {Platform.OS === 'ios' && isAppleSignInAvailable && AppleButton && (
              <AppleButton
                buttonStyle={AppleButton.Style.BLACK}
                buttonType={AppleButton.Type.SIGN_IN}
                style={styles.appleButton}
                onPress={() => {
                  console.log('🍎 [DEBUG] AuthScreen: Apple button pressed');
                  handleAppleSignIn();
                }}
                disabled={loading}
              />
            )}
            
            {/* Debug info removed - Apple Sign-In working */}
            
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

const createStyles = (theme: any) => StyleSheet.create({
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
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  signInButton: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DADCE0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonText: {
    color: '#3C4043',
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  googleIconBg: {
    width: 18,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif',
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  disabledButton: {
    opacity: 0.6,
  },
  infoText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.sm,
    fontSize: 12,
  },
});