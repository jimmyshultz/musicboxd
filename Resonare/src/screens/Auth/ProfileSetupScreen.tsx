import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Avatar,
  Card,
  Switch,
  useTheme,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { updateProfile } from '../../store/slices/authSlice';
import { userService } from '../../services/userService';
import { spacing } from '../../utils/theme';

interface ProfileSetupScreenProps {
  navigation: any;
}

export default function ProfileSetupScreen({ navigation }: ProfileSetupScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!user || !username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    setIsLoading(true);
    try {
      // Update profile in database
      await userService.updateUserProfile(user.id, {
        username: username.trim(),
        bio: bio.trim(),
        is_private: isPrivate,
      });

      // Update Redux state
      dispatch(updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        preferences: {
          ...user.preferences,
          privacy: {
            profileVisibility: isPrivate ? 'private' : 'public',
            activityVisibility: isPrivate ? 'private' : 'public',
          },
        },
      }));

      Alert.alert(
        'Profile Updated',
        'Your profile has been saved successfully!',
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('MainTabs'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to save profile. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Profile Setup?',
      'You can always update your profile later in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => navigation.replace('MainTabs'),
        },
      ]
    );
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
                  uri: user?.profilePicture || 'https://via.placeholder.com/80' 
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
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
              />
            </View>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSaveProfile}
            loading={isLoading}
            disabled={isLoading || !username.trim()}
            style={styles.saveButton}
          >
            Complete Setup
          </Button>

          <Button
            mode="outlined"
            onPress={handleSkip}
            disabled={isLoading}
            style={styles.skipButton}
          >
            Skip for Now
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
  skipButton: {
    paddingVertical: spacing.xs,
  },
});cing.xs,
  },
}); {
    paddingVertical: spacing.xs,
  },
});