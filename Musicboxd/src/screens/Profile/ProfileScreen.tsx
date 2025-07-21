import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  Divider,
  List,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { theme, spacing } from '../../utils/theme';
import { RootState } from '../../store';
import { loginSuccess } from '../../store/slices/authSlice';
import { SerializedUser, ProfileStackParamList } from '../../types';
import { userService } from '../../services/userService';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList>;

// Icon components to avoid creating them during render
const HistoryIcon = (props: any) => <List.Icon {...props} icon="history" />;
const ChevronRightIcon = (props: any) => <List.Icon {...props} icon="chevron-right" />;
const ReviewIcon = (props: any) => <List.Icon {...props} icon="rate-review" />;
const PlaylistIcon = (props: any) => <List.Icon {...props} icon="playlist-play" />;
const ChartIcon = (props: any) => <List.Icon {...props} icon="bar-chart" />;
const EditIcon = (props: any) => <List.Icon {...props} icon="edit" />;
const SettingsIcon = (props: any) => <List.Icon {...props} icon="settings" />;
const HelpIcon = (props: any) => <List.Icon {...props} icon="help" />;

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { following } = useSelector((state: RootState) => state.user);
  const { userListens, userReviews } = useSelector((state: RootState) => state.albums);
  
  const [stats, setStats] = useState({
    albumsListened: 0,
    reviews: 0,
    averageRating: 0,
    following: 0,
    followers: 0,
  });

  // Initialize mock current user if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !user) {
      const mockCurrentUser: SerializedUser = {
        id: 'current-user-id',
        username: 'musiclover2024',
        email: 'music@example.com',
        profilePicture: 'https://randomuser.me/api/portraits/men/32.jpg',
        bio: 'Passionate about discovering new music across all genres 🎶',
        joinedDate: new Date('2024-01-15').toISOString(),
        lastActiveDate: new Date().toISOString(),
        preferences: {
          favoriteGenres: ['Indie Rock', 'Electronic', 'Jazz'],
          notifications: {
            newFollowers: true,
            reviewLikes: true,
            friendActivity: true,
          },
          privacy: {
            profileVisibility: 'public',
            activityVisibility: 'public',
          },
        },
      };
      dispatch(loginSuccess(mockCurrentUser));
    }
  }, [dispatch, isAuthenticated, user]);

  // Load user stats from service (includes dynamic follow counts)
  useEffect(() => {
    const loadStats = async () => {
      if (user) {
        try {
          const userStats = await userService.getUserStats(user.id);
          setStats(userStats);
        } catch (error) {
          console.error('Error loading user stats:', error);
        }
      }
    };
    
    loadStats();
  }, [user, following, userListens, userReviews]); // Reload when following state or user interactions change

  if (!user) {
    return null; // or loading spinner
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
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
          Member since {new Date(user.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

            {/* Stats Grid */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCardWrapper}
            onPress={() => navigation.navigate('ListenedAlbums', { 
              userId: user.id, 
              username: user.username 
            })}
          >
            <Card style={styles.statCard} elevation={1}>
              <Card.Content style={styles.statContent}>
                <Text variant="headlineMedium" style={styles.statNumber}>
                  {stats.albumsListened}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Albums Listened
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.statCardWrapper}
            onPress={() => navigation.navigate('UserReviews', { 
              userId: user.id, 
              username: user.username 
            })}
          >
            <Card style={styles.statCard} elevation={1}>
              <Card.Content style={styles.statContent}>
                <Text variant="headlineMedium" style={styles.statNumber}>
                  {stats.reviews}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Ratings
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>

          <View style={styles.statCardWrapper}>
            <Card style={styles.statCard} elevation={1}>
              <Card.Content style={styles.statContent}>
                <Text variant="headlineMedium" style={styles.statNumber}>
                  {stats.averageRating > 0 ? `${stats.averageRating}★` : '—'}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Average Rating
                </Text>
              </Card.Content>
            </Card>
          </View>

          <TouchableOpacity
            style={styles.statCardWrapper}
            onPress={() => navigation.navigate('Followers', { 
              userId: user.id, 
              username: user.username,
              initialTab: 'following'
            })}
          >
            <Card style={styles.statCard} elevation={1}>
              <Card.Content style={styles.statContent}>
                <Text variant="headlineMedium" style={styles.statNumber}>
                  {stats.following}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Following
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.statCardWrapper}
            onPress={() => navigation.navigate('Followers', { 
              userId: user.id, 
              username: user.username,
              initialTab: 'followers'
            })}
          >
            <Card style={styles.statCard} elevation={1}>
              <Card.Content style={styles.statContent}>
                <Text variant="headlineMedium" style={styles.statNumber}>
                  {stats.followers}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Followers
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>

          {/* Empty placeholder to maintain grid alignment */}
          <View style={styles.statCardWrapper} />
        </View>
      </View>

      {/* Menu Options */}
      <Card style={styles.menuCard} elevation={1}>
        <List.Item
          title="Recently Listened"
          description="View your recent album listens"
          left={HistoryIcon}
          right={ChevronRightIcon}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="My Reviews"
          description="Manage your album reviews"
          left={ReviewIcon}
          right={ChevronRightIcon}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="My Lists"
          description="Create and manage album lists"
          left={PlaylistIcon}
          right={ChevronRightIcon}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="Listening Stats"
          description="View detailed listening statistics"
          left={ChartIcon}
          right={ChevronRightIcon}
          onPress={() => {}}
        />
      </Card>

      {/* Settings */}
      <Card style={styles.menuCard} elevation={1}>
        <List.Item
          title="Edit Profile"
          description="Update your profile information"
          left={EditIcon}
          right={ChevronRightIcon}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="Settings"
          description="App preferences and privacy"
          left={SettingsIcon}
          right={ChevronRightIcon}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="Help & Support"
          description="Get help with using the app"
          left={HelpIcon}
          right={ChevronRightIcon}
          onPress={() => {}}
        />
      </Card>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <Button
          mode="outlined"
          onPress={() => {}}
          style={styles.logoutButton}
          textColor={theme.colors.error}
        >
          Sign Out
        </Button>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
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
  statsContainer: {
    padding: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCardWrapper: {
    width: '48%',
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
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
  menuCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  logoutContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  logoutButton: {
    borderColor: theme.colors.error,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});