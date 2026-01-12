import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from 'react-native-paper';

interface NotificationBadgeProps {
  count: number;
}

/**
 * Notification Badge Component
 *
 * Displays a badge with unread notification count.
 * Hides when count is 0.
 */
export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
}) => {
  const theme = useTheme();

  if (count <= 0) {
    return null;
  }

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
      <Text style={[styles.badgeText, { color: theme.colors.onError }]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
