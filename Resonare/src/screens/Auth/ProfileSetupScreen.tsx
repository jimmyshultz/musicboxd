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
  TextInput,
  Button,
  Avatar,
  Card,
  Switch,
  Checkbox,
  useTheme,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { updateProfile } from '../../store/slices/authSlice';
import { userService } from '../../services/userService';
import { contentModerationService } from '../../services/contentModerationService';
import { spacing } from '../../utils/theme';

// Terms of Service and Community Guidelines URLs
const TERMS_OF_SERVICE_URL =
  'https://jimmyshultz.github.io/musicboxd/terms.html';
const COMMUNITY_GUIDELINES_URL =
  'https://jimmyshultz.github.io/musicboxd/guidelines.html';

interface ProfileSetupScreenProps {
  navigation: any;
}

export default function ProfileSetupScreen({
  navigation,
}: ProfileSetupScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const styles = createStyles(theme);

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isPrivate, setIsPrivate] = useState(false);
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

  const handleSaveProfile = async () => {
    if (!user || !username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        'Error',
        'You must accept the Terms of Service and Community Guidelines to continue',
      );
      return;
    }

    // Validate username for inappropriate content
    const usernameValidation = contentModerationService.validateUsername(
      username.trim(),
    );
    if (!usernameValidation.isValid) {
      Alert.alert(
        'Invalid Username',
        usernameValidation.error || 'Please choose a different username',
      );
      return;
    }

    // Validate bio for inappropriate content
    const bioValidation = contentModerationService.validateBio(bio.trim());
    if (!bioValidation.isValid) {
      Alert.alert(
        'Invalid Bio',
        bioValidation.error || 'Please revise your bio',
      );
      return;
    }

    setIsLoading(true);
    try {
      const termsAcceptedAt = new Date().toISOString();

      // Update profile in database with terms acceptance timestamp
      await userService.updateUserProfile(user.id, {
        username: username.trim(),
        bio: bio.trim(),
        is_private: isPrivate,
        terms_accepted_at: termsAcceptedAt,
      });

      // Update Redux state (including termsAcceptedAt so navigation works)
      // Pass termsAcceptedAt as string to avoid Redux serialization issues
      dispatch(
        updateProfile({
          username: username.trim(),
          bio: bio.trim(),
          termsAcceptedAt: termsAcceptedAt,
          preferences: {
            ...user.preferences,
            privacy: {
              profileVisibility: isPrivate ? 'private' : 'public',
              activityVisibility: isPrivate ? 'private' : 'public',
            },
          },
        }),
      );

      Alert.alert(
        'Profile Updated',
        'Your profile has been saved successfully!',
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('MainTabs'),
          },
        ],
      );
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to save profile. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Set Up Your Profile
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Let others discover your music taste
        </Text>

        <Card style={styles.profileCard} elevation={2}>
          <Card.Content>
            <View style={styles.avatarContainer}>
              <Avatar.Image
                size={80}
                source={{
                  uri: user?.profilePicture || 'https://via.placeholder.com/80',
                }}
              />
            </View>

            <TextInput
              label="Username *"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              placeholder="Choose a unique username"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              label="Bio (Optional)"
              value={bio}
              onChangeText={setBio}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Tell us about your music taste..."
            />

            <View style={styles.privacyContainer}>
              <View style={styles.privacyTextContainer}>
                <Text variant="bodyMedium" style={styles.privacyTitle}>
                  Private Profile
                </Text>
                <Text variant="bodySmall" style={styles.privacyDescription}>
                  Only approved followers can see your activity
                </Text>
              </View>
              <Switch value={isPrivate} onValueChange={setIsPrivate} />
            </View>
          </Card.Content>
        </Card>

        {/* Terms of Service and Community Guidelines */}
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
                  </Text>{' '}
                  and{' '}
                  <Text style={styles.termsLink} onPress={handleOpenGuidelines}>
                    Community Guidelines
                  </Text>
                </Text>
                <Text variant="bodySmall" style={styles.termsDescription}>
                  Our community guidelines prohibit objectionable content and
                  abusive behavior. Violations may result in account
                  termination.
                </Text>
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSaveProfile}
            loading={isLoading}
            disabled={isLoading || !username.trim() || !termsAccepted}
            style={styles.saveButton}
          >
            Complete Setup
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: spacing.lg,
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
    },
    profileCard: {
      marginBottom: spacing.xl,
      backgroundColor: theme.colors.surface,
    },
    avatarContainer: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    input: {
      marginBottom: spacing.md,
    },
    privacyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      marginTop: spacing.md,
    },
    privacyTextContainer: {
      flex: 1,
      marginRight: spacing.md,
    },
    privacyTitle: {
      fontWeight: '600',
      marginBottom: 2,
    },
    privacyDescription: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 16,
    },
    buttonContainer: {
      gap: spacing.md,
    },
    saveButton: {
      paddingVertical: spacing.xs,
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
  });
