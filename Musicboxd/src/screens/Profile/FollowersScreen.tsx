import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
// SafeAreaView import removed - using regular View since header handles safe area
import {
  Text,
  Avatar,
  Button,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { theme, spacing } from '../../utils/theme';
import { RootState } from '../../store';
import { User, SerializedUser, HomeStackParamList, SearchStackParamList, ProfileStackParamList } from '../../types';
import { addFollowing, removeFollowing } from '../../store/slices/userSlice';
import { userService } from '../../services/userService';

type FollowersScreenRouteProp = RouteProp<HomeStackParamList | SearchStackParamList | ProfileStackParamList, 'Followers'>;
type FollowersScreenNavigationProp = StackNavigationProp<HomeStackParamList | SearchStackParamList | ProfileStackParamList>;


const EmptyState = ({ activeTab, username }: { activeTab: string; username: string }) => (
  <View style={styles.emptyContainer}>
    <Text variant="bodyLarge" style={styles.emptyText}>
      {activeTab === 'followers' 
        ? `${username} has no followers yet`
        : `${username} isn't following anyone yet`
      }
    </Text>
  </View>
);

export default function FollowersScreen() {
  const route = useRoute<FollowersScreenRouteProp>();
  const navigation = useNavigation<FollowersScreenNavigationProp>();
  const dispatch = useDispatch();
  
  const { userId, username, initialTab = 'followers' } = route.params;
  const { following } = useSelector((state: RootState) => state.user);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState<User[]>([]);
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'followers') {
        const followersData = await userService.getUserFollowers(userId);
        setFollowers(followersData);
      } else {
        const followingData = await userService.getUserFollowing(userId);
        setFollowingUsers(followingData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab]);

  useEffect(() => {
    loadData();
  }, [userId, activeTab, loadData]);

  const isFollowing = (targetUserId: string) => {
    return following.some(user => user.id === targetUserId);
  };

  const handleFollowToggle = async (user: User) => {
    try {
      if (isFollowing(user.id)) {
        dispatch(removeFollowing(user.id));
        await userService.unfollowUser(user.id);
      } else {
        // Convert Date objects to strings to avoid Redux serialization issues
        const serializedUser: SerializedUser = {
          ...user,
          joinedDate: user.joinedDate.toISOString(),
          lastActiveDate: user.lastActiveDate.toISOString(),
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

  const renderUserItem = ({ item: user }: { item: User }) => {
    const isCurrentUser = user.id === currentUser?.id;
    const userIsFollowing = isFollowing(user.id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => navigateToProfile(user.id)}
      >
        <View style={styles.userInfo}>
          <Avatar.Image
            size={50}
            source={{ uri: user.profilePicture || 'https://via.placeholder.com/50x50/cccccc/999999?text=User' }}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text variant="bodyLarge" style={styles.username}>
              @{user.username}
            </Text>
            <Text variant="bodyMedium" style={styles.bio} numberOfLines={2}>
              {user.bio || 'Music enthusiast'}
            </Text>
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderBottomColor: theme.colors.border,
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
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});