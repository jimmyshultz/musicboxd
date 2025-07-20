import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  Divider,
  List,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { theme, spacing } from '../../utils/theme';
import { RootState } from '../../store';
import { User, Activity } from '../../types';
import { addFollowing, removeFollowing } from '../../store/slices/userSlice';
import { userService } from '../../services/userService';

type UserProfileScreenRouteProp = RouteProp<{ UserProfile: { userId: string } }, 'UserProfile'>;

export default function UserProfileScreen() {
  const route = useRoute<UserProfileScreenRouteProp>();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { userId } = route.params;
  const { following } = useSelector((state: RootState) => state.user);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [user, setUser] = useState<User | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const isFollowing = following.some(followedUser => followedUser.id === userId);
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const userData = await userService.getUserById(userId);
      const userActivity = await userService.getUserActivity(userId, 5);
      const statsData = await userService.getUserStats(userId);
      
      setUser(userData);
      setRecentActivity(userActivity);
      setUserStats(statsData);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = () => {
    if (!user) return;
    
    if (isFollowing) {
      dispatch(removeFollowing(userId));
    } else {
      dispatch(addFollowing(user));
    }
  };

  const formatActivityTime = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'review':
        return 'Reviewed an album';
      case 'listen':
        return 'Listened to an album';
      case 'list_created':
        return 'Created a new list';
      case 'follow':
        return 'Started following someone';
      default:
        return 'Activity';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="bodyLarge">User not found</Text>
      </View>
    );
  }

  if (!userStats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <IconButton
            icon="arrow-left"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          {!isOwnProfile && (
            <IconButton
              icon="dots-horizontal"
              onPress={() => {}}
              style={styles.menuButton}
            />
          )}
        </View>
        
        <View style={styles.profileInfo}>
          <Avatar.Image 
            size={100} 
            source={{ uri: user.profilePicture }} 
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.username}>
            @{user.username}
          </Text>
          <Text variant="bodyMedium" style={styles.bio}>
            {user.bio}
          </Text>
          <Text variant="bodySmall" style={styles.joinedDate}>
            Member since {user.joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Follow Button */}
        {!isOwnProfile && (
          <View style={styles.followContainer}>
            <Button
              mode={isFollowing ? "outlined" : "contained"}
              onPress={handleFollowToggle}
              style={styles.followButton}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statContent}>
              <Text variant="headlineMedium" style={styles.statNumber}>
                {userStats.albumsListened}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Albums Listened
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statContent}>
              <Text variant="headlineMedium" style={styles.statNumber}>
                {userStats.reviews}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Reviews
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statContent}>
              <Text variant="headlineMedium" style={styles.statNumber}>
                {userStats.following}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Following
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statContent}>
              <Text variant="headlineMedium" style={styles.statNumber}>
                {userStats.followers}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Followers
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>

      {/* Recent Activity */}
      <Card style={styles.activityCard} elevation={1}>
        <Card.Title title="Recent Activity" />
        <Card.Content>
          {recentActivity.map((activity, index) => (
            <View key={activity.id}>
              <List.Item
                title={getActivityDescription(activity)}
                description={formatActivityTime(activity.timestamp)}
                left={(props) => <List.Icon {...props} icon="music-note" />}
                onPress={() => {
                  // Navigate to album details or other relevant screen
                  if (activity.albumId) {
                    // navigation.navigate('AlbumDetails', { albumId: activity.albumId });
                  }
                }}
              />
              {index < recentActivity.length - 1 && <Divider />}
            </View>
          ))}
        </Card.Content>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  backButton: {
    margin: 0,
  },
  menuButton: {
    margin: 0,
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  username: {
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  bio: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  joinedDate: {
    color: theme.colors.textSecondary,
  },
  followContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  followButton: {
    minWidth: 120,
  },
  statsContainer: {
    padding: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statNumber: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  activityCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});