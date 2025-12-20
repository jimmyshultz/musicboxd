import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  ActivityIndicator,
  Button,
  useTheme,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { RootState } from '../../store';
import { UserProfile } from '../../types/database';
import { blockService } from '../../services/blockService';
import { spacing, shadows } from '../../utils/theme';
import ProfileAvatar from '../../components/ProfileAvatar';

// Extracted separator component to avoid re-creation during render
const ItemSeparator = () => <View style={{ height: spacing.sm }} />;

export default function BlockedUsersScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { user } = useSelector((state: RootState) => state.auth);

  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;

    try {
      const users = await blockService.getBlockedUsers(user.id);
      setBlockedUsers(users);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBlockedUsers();
    }, [loadBlockedUsers])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBlockedUsers();
    setRefreshing(false);
  }, [loadBlockedUsers]);

  const handleUnblock = (blockedUser: UserProfile) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock @${blockedUser.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            if (!user) return;

            setUnblockingUserId(blockedUser.id);
            try {
              const result = await blockService.unblockUser(user.id, blockedUser.id);
              if (result.success) {
                setBlockedUsers(prev => prev.filter(u => u.id !== blockedUser.id));
              } else {
                Alert.alert('Error', result.error || 'Failed to unblock user');
              }
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            } finally {
              setUnblockingUserId(null);
            }
          },
        },
      ]
    );
  };

  const renderBlockedUser = ({ item }: { item: UserProfile }) => (
    <View style={styles.userItem}>
      <ProfileAvatar
        uri={item.avatar_url}
        size={50}
      />
      <View style={styles.userInfo}>
        <Text variant="titleMedium" style={styles.username}>
          @{item.username}
        </Text>
        {item.display_name && (
          <Text variant="bodySmall" style={styles.displayName}>
            {item.display_name}
          </Text>
        )}
      </View>
      <Button
        mode="outlined"
        onPress={() => handleUnblock(item)}
        loading={unblockingUserId === item.id}
        disabled={unblockingUserId !== null}
        compact
        style={styles.unblockButton}
      >
        Unblock
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading blocked users...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No Blocked Users
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            You haven't blocked anyone yet. You can block users from their profile page.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderBlockedUser}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={ItemSeparator}
        />
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: spacing.md,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    ...shadows.small,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  username: {
    fontWeight: '600',
  },
  displayName: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  unblockButton: {
    borderColor: theme.colors.error,
  },
  separator: {
    height: spacing.sm,
  },
});
