import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
// SafeAreaView import removed - using regular View since header handles safe area
import {
  Text,
  Avatar,
  Button,
  ActivityIndicator,
  SegmentedButtons,
  useTheme,
} from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { spacing } from '../../utils/theme';
import { RootState } from '../../store';
import { SerializedUser, HomeStackParamList, SearchStackParamList, ProfileStackParamList } from '../../types';
import { UserProfile } from '../../types/database';
import { addFollowing, removeFollowing } from '../../store/slices/userSlice';
import { userService } from '../../services/userService';
import ProfileAvatar from '../../components/ProfileAvatar';

type FollowersScreenRouteProp = RouteProp<HomeStackParamList | SearchStackParamList | ProfileStackParamList, 'Followers'>;
type FollowersScreenNavigationProp = StackNavigationProp<HomeStackParamList | SearchStackParamList | ProfileStackParamList>;

// EmptyState component moved outside to avoid redefinition on every render
const EmptyState = ({ activeTab: tab, username: name }: { activeTab: string; username: string }) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.emptyContainer}>
      <Text variant="bodyLarge" style={styles.emptyText}>
        {tab === 'followers'
          ? `${name} has no followers yet`
          : `${name} isn't following anyone yet`
        }
      </Text>
    </View>
  );
};

export default function FollowersScreen() {
  const route = useRoute<FollowersScreenRouteProp>();
  const navigation = useNavigation<FollowersScreenNavigationProp>();
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = createStyles(theme);

  const { userId, username, initialTab = 'followers' } = route.params;
  const { following } = useSelector((state: RootState) => state.user);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [followingUsers, setFollowingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load both followers and following data simultaneously
      console.log('Loading both followers and following for user:', userId);
      const [followersData, followingData] = await Promise.all([
        userService.getUserFollowers(userId),
        userService.getUserFollowing(userId)
      ]);

      console.log('Loaded followers:', followersData.length);
      console.log('Loaded following:', followingData.length);

      setFollowers(followersData);
      setFollowingUsers(followingData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]); // Removed activeTab dependency since we load both

  useEffect(() => {
    loadData();
  }, [loadData]); // Only reload when userId changes (via loadData dependency)

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const isFollowing = (targetUserId: string) => {
    return following.some(user => user.id === targetUserId);
  };

  const handleFollowToggle = async (user: UserProfile) => {
    try {
      if (isFollowing(user.id)) {
        dispatch(removeFollowing(user.id));
        await userService.unfollowUser(user.id);
      } else {
        // Create a serialized user for Redux store
        // Note: user is UserProfile type, convert to SerializedUser
        const serializedUser: SerializedUser = {
          id: user.id,
          username: user.username,
          email: '', // UserProfile doesn't have email, provide default
          profilePicture: user.avatar_url,
          bio: user.bio,
          joinedDate: user.created_at, // Use created_at as joinedDate
          lastActiveDate: user.updated_at, // Use updated_at as lastActiveDate
          preferences: {
            favoriteGenres: [],
            favoriteAlbumIds: [],
            notifications: {
              newFollowers: true,
              albumRecommendations: true,
              friendActivity: true,
            },
            privacy: {
              showActivity: !user.is_private,
              activityVisibility: user.is_private ? 'private' as const : 'public' as const,
            }
          }
        };
        dispatch(addFollowing(serializedUser));
        await userService.followUser(user.id);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const navigateToProfile = (targetUserId: string) => {
    if (targetUserId === currentUser?.id) {
      // Navigate back to main profile tab
      navigation.goBack();
    } else {
      navigation.navigate('UserProfile', { userId: targetUserId });
    }
  };

  const renderUserItem = ({ item: user }: { item: UserProfile }) => {
    const isCurrentUser = user.id === currentUser?.id;
    const userIsFollowing = isFollowing(user.id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => navigateToProfile(user.id)}
      >
        <View style={styles.userInfo}>
          <ProfileAvatar
            uri={user.avatar_url}
            size={50}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text variant="bodyLarge" style={styles.username}>
              @{user.username}
            </Text>
            {user.bio && (
              <Text variant="bodyMedium" style={styles.bio} numberOfLines={2}>
                {user.bio}
              </Text>
            )}
          </View>
        </View>

        {!isCurrentUser && (
          <Button
            mode={userIsFollowing ? "outlined" : "contained"}
            onPress={() => handleFollowToggle(user)}
            style={styles.followButton}
            compact
          >
            {userIsFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </TouchableOpacity>
    );
  };



  const currentData = activeTab === 'followers' ? followers : followingUsers;

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          @{username}
        </Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'followers' | 'following')}
          buttons={[
            {
              value: 'followers',
              label: `${followers.length} Followers`,
            },
            {
              value: 'following',
              label: `${followingUsers.length} Following`,
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={currentData}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState activeTab={activeTab} username={username} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: theme.colors.surface,
  },

  headerTitle: {
    fontWeight: 'bold',
  },
  placeholder: {
    width: 48, // Same width as back button
  },
  tabContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  segmentedButtons: {
    backgroundColor: theme.colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  bio: {
    color: theme.colors.onSurfaceVariant,
  },
  followButton: {
    minWidth: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});