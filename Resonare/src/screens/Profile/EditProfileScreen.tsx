import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Avatar,
  Card,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import ImagePicker from 'react-native-image-crop-picker';
import Icon from 'react-native-vector-icons/FontAwesome';

import { ProfileStackParamList } from '../../types';
import { RootState } from '../../store';
import { userService } from '../../services/userService';
import { storageService } from '../../services/storageService';
import { updateProfile } from '../../store/slices/authSlice';
import { spacing } from '../../utils/theme';

type EditProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList>;

// Simple profanity filter word list
const PROFANITY_WORDS = [
  'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap', 'piss',
  'bastard', 'slut', 'whore', 'fag', 'nigger', 'retard', 'gay',
  // Add more as needed
];

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const styles = createStyles(theme);

  const [username, setUsername] = useState(user?.username || '');
  const [_profilePicture, _setProfilePicture] = useState(user?.profilePicture || '');
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const bypassWarningRef = React.useRef(false);

  // Track if changes have been made
  useEffect(() => {
    const usernameChanged = username !== (user?.username || '');
    const imageChanged = newImageUri !== null;
    setHasUnsavedChanges(usernameChanged || imageChanged);
  }, [username, newImageUri, user?.username]);

  // Handle back button with unsaved changes warning
  useLayoutEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Don't show warning if we're bypassing, saving, or no unsaved changes
      if (bypassWarningRef.current || isSaving || !hasUnsavedChanges) {
        bypassWarningRef.current = false; // Reset for next time
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              bypassWarningRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, isSaving]);



  const validateUsername = (usernameToValidate: string): string | null => {
    // Length validation
    if (usernameToValidate.length < 5) {
      return 'Username must be at least 5 characters';
    }
    if (usernameToValidate.length > 16) {
      return 'Username must be 16 characters or less';
    }

    // Character validation
    const validChars = /^[a-zA-Z0-9._-]+$/;
    if (!validChars.test(usernameToValidate)) {
      return 'Username can only contain letters, numbers, periods, dashes, and underscores';
    }

    // Profanity filter
    const lowerUsername = usernameToValidate.toLowerCase();
    for (const word of PROFANITY_WORDS) {
      if (lowerUsername.includes(word)) {
        return 'Username contains inappropriate language';
      }
    }

    return null;
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    const error = validateUsername(text);
    setUsernameError(error);
  };

  const handleSelectImage = () => {
    ImagePicker.openPicker({
      width: 300,
      height: 300,
      cropping: true,
      cropperCircleOverlay: false, // Square crop
      compressImageMaxWidth: 300,
      compressImageMaxHeight: 300,
      compressImageQuality: 0.8,
      mediaType: 'photo',
      includeBase64: true, // Include base64 for easier upload
      forceJpg: true, // Force JPEG format for consistency
    }).then(image => {
      console.log('Image picker result:', {
        path: image.path,
        mime: image.mime,
        size: image.size,
        width: image.width,
        height: image.height,
      });
      setNewImageUri(image.path);
    }).catch(error => {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Image picker error:', error);
        Alert.alert('Error', 'Unable to select image. Please try again.');
      }
    });
  };

  const handleSave = async () => {
    if (!user || loading || usernameError || !hasUnsavedChanges) return;

    setLoading(true);
    setIsSaving(true);
    
    try {
      // Validate username uniqueness if it changed
      if (username !== user.username) {
        const isAvailable = await userService.isUsernameAvailable(username);
        if (!isAvailable) {
          setUsernameError('Username is already taken');
          setLoading(false);
          setIsSaving(false);
          return;
        }
      }

      // Prepare updates
      const updates: any = {};
      
      if (username !== user.username) {
        updates.username = username;
      }

      // Handle profile picture upload if changed
      if (newImageUri) {
        try {
          // Delete old profile picture if it exists
          if (user.profilePicture) {
            await storageService.deleteProfilePicture(user.profilePicture);
          }
          
          // Upload new profile picture
          const newAvatarUrl = await storageService.uploadProfilePicture(user.id, newImageUri);
          updates.avatar_url = newAvatarUrl;
        } catch (uploadError) {
          console.error('Error uploading profile picture:', uploadError);
          Alert.alert('Upload Error', 'Unable to upload profile picture. Please try again.');
          setLoading(false);
          setIsSaving(false);
          return;
        }
      }

      // Update profile
      if (Object.keys(updates).length > 0) {
        const updatedProfile = await userService.updateProfile(user.id, updates);
        
        // Update Redux store
        dispatch(updateProfile({
          username: updatedProfile.username,
          profilePicture: updatedProfile.avatar_url || undefined,
        }));
      }

      // Set bypass flag and clear unsaved changes before navigating
      bypassWarningRef.current = true;
      setHasUnsavedChanges(false);
      
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
      
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Unable to update profile. Please try again.');
    }
    
    setLoading(false);
    setIsSaving(false);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: () => {
              // Set bypass flag to prevent beforeRemove listener from showing another alert
              bypassWarningRef.current = true;
              navigation.goBack();
            }
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const getCurrentProfileImage = () => {
    if (newImageUri) {
      return { uri: newImageUri };
    }
    if (user?.profilePicture) {
      return { uri: user.profilePicture };
    }
    return undefined;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Picture Section */}
      <Card style={styles.section} elevation={1}>
        <Card.Content style={styles.profilePictureSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Profile Picture
          </Text>
          
          <TouchableOpacity onPress={handleSelectImage} style={styles.avatarContainer}>
            <Avatar.Image
              size={120}
              source={getCurrentProfileImage()}
              style={styles.avatar}
            />
            <View style={styles.avatarOverlay}>
              <Icon name="camera" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <Text variant="bodySmall" style={styles.avatarHint}>
            Tap to change profile picture
          </Text>
          
          {newImageUri && (
            <Button
              mode="text"
              onPress={() => setNewImageUri(null)}
              style={styles.removeImageButton}
            >
              Remove new image
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Username Section */}
      <Card style={styles.section} elevation={1}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Username
          </Text>
          
          <TextInput
            label="Username"
            value={username}
            onChangeText={handleUsernameChange}
            error={!!usernameError}
            disabled={loading}
            style={styles.usernameInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {usernameError && (
            <Text variant="bodySmall" style={styles.errorText}>
              {usernameError}
            </Text>
          )}
          
          <Text variant="bodySmall" style={styles.usernameHint}>
            5-16 characters. Letters, numbers, periods, dashes, and underscores only.
          </Text>
        </Card.Content>
      </Card>

      {/* Preview Section */}
      {hasUnsavedChanges && (
        <Card style={styles.section} elevation={1}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Preview
            </Text>
            
            <View style={styles.previewContainer}>
              <Avatar.Image
                size={60}
                source={getCurrentProfileImage()}
                style={styles.previewAvatar}
              />
              <View style={styles.previewText}>
                <Text variant="titleMedium" style={styles.previewUsername}>{username}</Text>
                <Text variant="bodySmall" style={styles.previewLabel}>
                  This is how your profile will look
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Save/Cancel Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={handleCancel}
          disabled={loading}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={loading || !!usernameError || !hasUnsavedChanges}
          loading={loading}
          style={styles.saveButton}
        >
          Save Changes
        </Button>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: theme.colors.primary,
  },
  profilePictureSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatar: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  avatarHint: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  removeImageButton: {
    marginTop: spacing.xs,
  },
  usernameInput: {
    marginBottom: spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: spacing.xs,
  },
  usernameHint: {
    color: theme.colors.onSurfaceVariant,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
  },
  previewAvatar: {
    marginRight: spacing.md,
  },
  previewText: {
    flex: 1,
  },
  previewUsername: {
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  previewLabel: {
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});