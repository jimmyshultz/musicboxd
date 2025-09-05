import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { DevUtils } from '../config/environment';
import { colors, spacing } from '../utils/theme';

/**
 * Environment Badge Component
 * Shows environment indicator in staging builds to help testers
 * identify which environment they're using
 */
export const EnvironmentBadge: React.FC = () => {
  if (!DevUtils.shouldShowEnvironmentBadge()) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text variant="labelSmall" style={styles.badgeText}>
        {DevUtils.getEnvironmentBadgeText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 50, // Below status bar
    right: spacing.md,
    backgroundColor: colors.warning || '#FF9500',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 9999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
});