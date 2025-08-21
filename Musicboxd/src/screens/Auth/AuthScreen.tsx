import React from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { signInWithGoogle } from '../../store/slices/authSlice';
import { theme, spacing } from '../../utils/theme';

export default function AuthScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Musicboxd
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
          <GoogleSigninButton
            style={styles.googleButton}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={handleGoogleSignIn}
            disabled={loading}
          />
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
  googleButton: {
    width: '100%',
    height: 48,
  },
});