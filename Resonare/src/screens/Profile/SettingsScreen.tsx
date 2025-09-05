import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Switch,
  Divider,
  ActivityIndicator,
  Button,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';

import { ProfileStackParamList } from '../../types';
import { RootState } from '../../store';
import Icon from 'react-native-vector-icons/FontAwesome';
import { logout } from '../../store/slices/authSlice';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../utils/theme';

type SettingsScreenNavigationProp = StackNavigationProp<ProfileStackParamList>;

interface UserSettings {
  isPrivate: boolean;
  allowFollowers: boolean;
  showActivity: boolean;
  emailNotifications: boolean;
}

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [settings, setSettings] = useState<UserSettings>({
    isPrivate: false,
    allowFollowers: true,
    showActivity: true,
    emailNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      const profile = await userService.getUserProfile(user.id);
      if (profile) {
        setSettings({
          isPrivate: profile.is_private,
          allowFollowers: true, // This could be extended in the future
          showActivity: !profile.is_private, // Private profiles don't show activity
          emailNotifications: true, // This could be stored separately
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    if (!user) return;

    setSaving(true);
    try {
      const newSettings = { ...settings, [key]: value };
      
      // Handle privacy setting update
      if (key === 'isPrivate') {
        await userService.updateProfile(user.id, { is_private: value });
        // If making profile private, also hide activity
        if (value) {
          newSettings.showActivity = false;
        }
      }
      
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    title: string,
    description: string,
    value: boolean,
    onToggle: () => void,
    disabled = false
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <Text variant="titleMedium" style={styles.settingTitle}>
          {title}
        </Text>
        <Text variant="bodySmall" style={styles.settingDescription}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled || saving}
      />
    </View>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderSection(
        'Privacy',
        <>
          {renderSettingItem(
            'Private Profile',
            'Only approved followers can see your profile and activity',
            settings.isPrivate,
            () => updateSetting('isPrivate', !settings.isPrivate)
          )}
          {renderSettingItem(
            'Show Activity',
            'Let others see your listening activity and ratings',
            settings.showActivity,
            () => updateSetting('showActivity', !settings.showActivity),
            settings.isPrivate // Disabled if profile is private
          )}
          
          {/* Follow Requests navigation - only show for private profiles */}
          {settings.isPrivate && (
            <TouchableOpacity 
              style={styles.accountItem} 
              onPress={() => navigation.navigate('FollowRequests')}
            >
              <Text variant="titleMedium" style={styles.accountItemText}>
                Follow Requests
              </Text>
              <Icon name="chevron-right" size={16} color="#666" />
            </TouchableOpacity>
          )}
          
          <Divider style={styles.divider} />
        </>
      )}

      {renderSection(
        'Social',
        <>
          {renderSettingItem(
            'Allow Followers',
            'Let other users follow you and see your activity',
            settings.allowFollowers,
            () => updateSetting('allowFollowers', !settings.allowFollowers),
            settings.isPrivate // Could be extended for more granular control
          )}
          <Divider style={styles.divider} />
        </>
      )}

      {renderSection(
        'Notifications',
        <>
          {renderSettingItem(
            'Email Notifications',
            'Receive email updates about your account and activity',
            settings.emailNotifications,
            () => updateSetting('emailNotifications', !settings.emailNotifications)
          )}
          <Divider style={styles.divider} />
        </>
      )}

      {renderSection(
        'Account',
        <>
          <TouchableOpacity style={styles.accountItem} onPress={() => navigation.navigate('EditProfile')}>
            <Text variant="titleMedium" style={styles.accountItemText}>
              Edit Profile
            </Text>
            <Icon name="chevron-right" size={16} color="#666" />
          </TouchableOpacity>
          
          <Divider style={styles.divider} />
        </>
      )}

      <View style={styles.logoutSection}>
        <Button
          mode="outlined"
          onPress={handleLogout}
          textColor={colors.error}
          buttonColor="transparent"
          style={styles.logoutButton}
        >
          Logout
        </Button>
      </View>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          Resonare v1.0.0
        </Text>
        <Text variant="bodySmall" style={styles.footerText}>
          Made with ♪ for music lovers
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    fontWeight: '600',
    color: colors.primary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  settingContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingTitle: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  settingDescription: {
    color: colors.textSecondary,
    lineHeight: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  accountItemText: {
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },
  logoutSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  logoutButton: {
    borderColor: colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});