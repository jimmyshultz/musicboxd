import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Checkbox,
  useTheme,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { updateProfile, signOutUser } from '../../store/slices/authSlice';
import { userService } from '../../services/userService';
import { spacing } from '../../utils/theme';

// Terms of Service and Community Guidelines URLs
const TERMS_OF_SERVICE_URL = 'https://jimmyshultz.github.io/musicboxd/terms.html';
const COMMUNITY_GUIDELINES_URL = 'https://jimmyshultz.github.io/musicboxd/guidelines.html';

export default function TermsAcceptanceScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const styles = createStyles(theme);
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenTerms = () => {
    Linking.openURL(TERMS_OF_SERVICE_URL).catch(() => {
      Alert.alert('Error', 'Could not open Terms of Service');
    });
  };

  const handleOpenGuidelines = () => {
    Linking.openURL(COMMUNITY_GUIDELINES_URL).catch(() => {
      Alert.alert('Error', 'Could not open Community Guidelines');
    });
  };

  const handleAcceptTerms = async () => {
    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Error', 'You must accept the Terms of Service and Community Guidelines to continue');
      return;
    }

    setIsLoading(true);
    try {
      const termsAcceptedAt = new Date().toISOString();
      
      // Update profile in database with terms acceptance timestamp
      await userService.updateUserProfile(user.id, {
        terms_accepted_at: termsAcceptedAt,
      });

      // Update Redux state with the new termsAcceptedAt
      // Pass as string to avoid Redux serialization issues
      dispatch(updateProfile({
        termsAcceptedAt: termsAcceptedAt,
      } as any));

    } catch (error: any) {
      console.error('Error accepting terms:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to save. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Terms',
      'You cannot use Resonare without accepting the Terms of Service and Community Guidelines. Would you like to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => dispatch(signOutUser()),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Updated Terms of Service
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          We've updated our Terms of Service and Community Guidelines. Please review and accept to continue using Resonare.
        </Text>

        <Card style={styles.infoCard} elevation={2}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              What's New
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              • Clear community guidelines for respectful interactions
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              • Content moderation to keep our community safe
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              • Tools to report and block users if needed
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              • Zero tolerance for objectionable content
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.termsCard} elevation={2}>
          <Card.Content>
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View style={styles.checkboxWrapper}>
                <Checkbox
                  status={termsAccepted ? 'checked' : 'unchecked'}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                />
              </View>
              <View style={styles.termsTextContainer}>
                <Text variant="bodyMedium" style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink} onPress={handleOpenTerms}>
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink} onPress={handleOpenGuidelines}>
                    Community Guidelines
                  </Text>
                </Text>
                <Text variant="bodySmall" style={styles.termsDescription}>
                  Our community guidelines prohibit objectionable content and abusive behavior. Violations may result in account termination.
                </Text>
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleAcceptTerms}
            loading={isLoading}
            disabled={isLoading || !termsAccepted}
            style={styles.acceptButton}
          >
            Accept and Continue
          </Button>
          <Button
            mode="text"
            onPress={handleDecline}
            disabled={isLoading}
            style={styles.declineButton}
            textColor={theme.colors.error}
          >
            Decline and Sign Out
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  title: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  infoCard: {
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  infoText: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  termsCard: {
    marginBottom: spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxWrapper: {
    borderWidth: 2,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  termsText: {
    lineHeight: 22,
  },
  termsLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  termsDescription: {
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  buttonContainer: {
    gap: spacing.sm,
  },
  acceptButton: {
    paddingVertical: spacing.xs,
  },
  declineButton: {
    paddingVertical: spacing.xs,
  },
});
