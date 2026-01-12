import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Switch,
  Divider,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useSelector } from 'react-redux';

import { RootState } from '../../store';
import { pushTokenService } from '../../services/pushTokenService';
import { PushPreferences } from '../../types/database';
import { spacing } from '../../utils/theme';

/**
 * Screen for managing push notification preferences
 * Allows users to toggle different notification types on/off
 */
export default function NotificationSettingsScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const styles = createStyles(theme);

  const [preferences, setPreferences] = useState<Partial<PushPreferences>>({
    push_enabled: true,
    follows_enabled: true,
    likes_enabled: true,
    comments_enabled: true,
    marketing_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;

    try {
      const prefs = await pushTokenService.getPreferences(user.id);
      if (prefs) {
        setPreferences(prefs);
      }
      // If no preferences exist, use defaults (already set in state)
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPreferences();
    } finally {
      setRefreshing(false);
    }
  }, [loadPreferences]);

  const updatePreference = async (
    key: keyof PushPreferences,
    value: boolean,
  ) => {
    if (!user?.id) return;

    setSaving(true);
    const previousPreferences = { ...preferences };

    try {
      // Optimistically update UI
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);

      // If disabling master switch, visually disable all toggles
      if (key === 'push_enabled' && !value) {
        // Keep other values for when they re-enable
      }

      // Save to database
      await pushTokenService.updatePreferences(user.id, { [key]: value });
    } catch (error) {
      console.error('Error updating notification preference:', error);
      // Revert optimistic update
      setPreferences(previousPreferences);
      Alert.alert('Error', 'Failed to update preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderSettingItem = (
    title: string,
    description: string,
    value: boolean,
    onToggle: () => void,
    disabled = false,
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <Text
          variant="titleMedium"
          style={[styles.settingTitle, disabled && styles.disabledText]}
        >
          {title}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.settingDescription, disabled && styles.disabledText]}
        >
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
          Loading notification settings...
        </Text>
      </View>
    );
  }

  const isPushEnabled = preferences.push_enabled !== false;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderSection(
        'Master Control',
        <>
          {renderSettingItem(
            'Push Notifications',
            'Enable or disable all push notifications',
            isPushEnabled,
            () => updatePreference('push_enabled', !isPushEnabled),
          )}
          <Divider style={styles.divider} />
        </>,
      )}

      {renderSection(
        'Social Notifications',
        <>
          {renderSettingItem(
            'Follows',
            'When someone follows you or requests to follow',
            preferences.follows_enabled !== false,
            () =>
              updatePreference('follows_enabled', !preferences.follows_enabled),
            !isPushEnabled,
          )}
          {renderSettingItem(
            'Likes',
            'When someone likes your diary entry',
            preferences.likes_enabled !== false,
            () => updatePreference('likes_enabled', !preferences.likes_enabled),
            !isPushEnabled,
          )}
          {renderSettingItem(
            'Comments',
            'When someone comments on your diary entry',
            preferences.comments_enabled !== false,
            () =>
              updatePreference(
                'comments_enabled',
                !preferences.comments_enabled,
              ),
            !isPushEnabled,
          )}
          <Divider style={styles.divider} />
        </>,
      )}

      {renderSection(
        'Other',
        <>
          {renderSettingItem(
            'App Updates',
            'Occasional notifications about new features and improvements',
            preferences.marketing_enabled !== false,
            () =>
              updatePreference(
                'marketing_enabled',
                !preferences.marketing_enabled,
              ),
            !isPushEnabled,
          )}
        </>,
      )}

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          Push notifications require a physical device.
        </Text>
        <Text variant="bodySmall" style={styles.footerText}>
          Changes take effect immediately.
        </Text>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacing.md,
      color: theme.colors.onSurfaceVariant,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.colors.surface,
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
      color: theme.colors.onSurfaceVariant,
      lineHeight: 16,
    },
    disabledText: {
      opacity: 0.5,
    },
    divider: {
      backgroundColor: theme.colors.outline,
      height: 1,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    footerText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
  });
