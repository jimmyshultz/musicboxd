import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Text, ActivityIndicator, Avatar, Card, useTheme, Button } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome';

import { ProfileStackParamList, AppNotification, HomeStackParamList } from '../../types';
import { RootState, AppDispatch } from '../../store';
import { notificationService } from '../../services/notificationService';
import {
  fetchNotificationsStart,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
} from '../../store/slices/notificationSlice';
import { spacing } from '../../utils/theme';

// NotificationsScreen can be in either HomeStack or ProfileStack
type NotificationsScreenNavigationProp = StackNavigationProp<HomeStackParamList | ProfileStackParamList, 'Notifications'>;

// Separate component for notification item to allow hooks
interface NotificationItemProps {
  item: AppNotification;
  onPress: (notification: AppNotification) => void;
  onDelete: (notificationId: string) => void;
  formatTimeAgo: (dateString: string) => string;
  getNotificationMessage: (notification: AppNotification) => string;
  theme: any;
  styles: any;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  item,
  onPress,
  onDelete,
  formatTimeAgo,
  getNotificationMessage,
  theme: _theme,
  styles,
}) => {
  const swipeableRef = useRef<Swipeable>(null);
  const isUnread = !item.read;

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => onDelete(item.id)}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.deleteActionContent, { transform: [{ scale }] }]}>
          <Icon name="trash" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
    >
      <TouchableOpacity
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <Card
          style={[
            styles.notificationCard,
            isUnread && styles.unreadCard,
          ]}
        >
          <Card.Content style={styles.notificationContent}>
            <View style={styles.userInfo}>
              <Avatar.Image
                size={50}
                source={{ 
                  uri: item.actorAvatar || 'https://via.placeholder.com/50x50/cccccc/999999?text=U' 
                }}
                style={styles.avatar}
              />
              <View style={styles.notificationDetails}>
                <Text variant="bodyLarge" style={[
                  styles.notificationText,
                  isUnread && styles.unreadText,
                ]}>
                  {getNotificationMessage(item)}
                </Text>
                <Text variant="bodySmall" style={styles.timeText}>
                  {formatTimeAgo(item.createdAt)}
                </Text>
              </View>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
          </Card.Content>
        </Card>
    </TouchableOpacity>
    </Swipeable>
  );
};

export default function NotificationsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const { notifications, loading } = useSelector((state: RootState) => state.notifications);
  const theme = useTheme();
  const styles = createStyles(theme);
  
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      dispatch(fetchNotificationsStart());
      const fetchedNotifications = await notificationService.getNotifications(currentUser.id);
      
      // Transform to AppNotification format
      const appNotifications: AppNotification[] = fetchedNotifications.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        actorId: n.actor_id,
        actorUsername: n.actor?.username,
        actorAvatar: n.actor?.avatar_url,
        referenceId: n.reference_id,
        read: n.read,
        createdAt: n.created_at,
      }));
      
      dispatch(fetchNotificationsSuccess(appNotifications));
    } catch (error) {
      console.error('Error loading notifications:', error);
      dispatch(fetchNotificationsFailure(error instanceof Error ? error.message : 'Failed to load notifications'));
    }
  }, [currentUser, dispatch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = async (notification: AppNotification) => {
    // Mark as read if unread
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification.id);
        dispatch(markAsRead(notification.id));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Handle diary entry notifications
    if (notification.type === 'diary_like' || notification.type === 'diary_comment') {
      if (notification.referenceId) {
        // Navigate to the diary entry details
        // We need to get the userId from the diary entry
        try {
          const { diaryEntriesService } = await import('../../services/diaryEntriesService');
          const entry = await diaryEntriesService.getDiaryEntryById(notification.referenceId);
          if (entry) {
            navigation.navigate('DiaryEntryDetails', {
              entryId: notification.referenceId,
              userId: entry.user_id,
            });
          } else {
            Alert.alert('Not Found', 'This diary entry no longer exists.');
          }
        } catch (error) {
          console.error('Error loading diary entry for notification:', error);
          Alert.alert('Error', 'Unable to open diary entry.');
        }
      }
      return;
    }

    // If it's a follow request and the current user is private, navigate to Follow Requests
    if (notification.type === 'follow_request' && currentUser?.preferences?.privacy?.profileVisibility === 'private') {
      // Navigate to Profile tab, then to FollowRequests screen
      // Use getParent() to access the tab navigator (HomeStack -> TabNavigator)
      const parent = navigation.getParent();
      if (parent) {
        // Navigate to Profile tab with FollowRequests screen
        (parent as any).navigate('Profile', { screen: 'FollowRequests' });
      } else {
        // Fallback: try direct navigation (might work if we're already in ProfileStack)
        try {
          (navigation as any).navigate('FollowRequests');
        } catch (error) {
          console.error('Error navigating to FollowRequests:', error);
        }
      }
    } else {
      // Otherwise, navigate to actor's profile (for follow notifications or public users)
      navigation.navigate('UserProfile', { userId: notification.actorId });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    
    try {
      await notificationService.markAllAsRead(currentUser.id);
      dispatch(markAllAsRead());
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      dispatch(removeNotification(notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    if (!currentUser) return;
    
    try {
      await notificationService.deleteAllNotifications(currentUser.id);
      dispatch(clearAllNotifications());
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return '1w+ ago';
  };

  const getNotificationMessage = (notification: AppNotification) => {
    const username = notification.actorUsername || 'Someone';
    if (notification.type === 'follow') {
      return `${username} started following you`;
    } else if (notification.type === 'follow_request') {
      return `${username} requested to follow you`;
    } else if (notification.type === 'follow_request_accepted') {
      return `${username} accepted your follow request`;
    } else if (notification.type === 'diary_like') {
      return `${username} liked your diary entry`;
    } else if (notification.type === 'diary_comment') {
      return `${username} commented on your diary entry`;
    }
    return '';
  };

  const renderNotificationItem = ({ item }: { item: AppNotification }) => {
    return (
      <NotificationItem
        item={item}
        onPress={handleNotificationPress}
        onDelete={handleDeleteNotification}
        formatTimeAgo={formatTimeAgo}
        getNotificationMessage={getNotificationMessage}
        theme={theme}
        styles={styles}
      />
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length > 0 && (
        <View style={styles.markAllContainer}>
          <View style={styles.actionButtonsRow}>
            {unreadCount > 0 && (
              <Button
                mode="text"
                onPress={handleMarkAllAsRead}
                textColor={theme.colors.primary}
                style={styles.actionButton}
              >
                Mark all as read
              </Button>
            )}
            <Button
              mode="text"
              onPress={handleClearAll}
              textColor={theme.colors.error}
              style={styles.actionButton}
            >
              Clear all
            </Button>
          </View>
        </View>
      )}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Notifications
            </Text>
          </View>
        }
      />
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
  markAllContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    marginHorizontal: 0,
  },
  deleteAction: {
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 8,
  },
  deleteActionContent: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: spacing.lg,
  },
  notificationCard: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  unreadCard: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  notificationContent: {
    padding: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: spacing.md,
  },
  notificationDetails: {
    flex: 1,
  },
  notificationText: {
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  unreadText: {
    fontWeight: '600',
  },
  timeText: {
    color: theme.colors.onSurfaceVariant,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl * 2,
  },
  emptyTitle: {
    color: theme.colors.onBackground,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyMessage: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
});
