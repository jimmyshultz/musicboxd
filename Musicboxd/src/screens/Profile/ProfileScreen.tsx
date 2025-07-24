import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text, List, Avatar, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { ProfileStackParamList, Album, Listen, Review } from '../../types';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { AlbumService } from '../../services/albumService';
import { theme, spacing, shadows } from '../../utils/theme';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList>;

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = 120;

// Icon components to avoid creating them during render
const settingsIconStyle = { fontSize: 18, color: '#666', width: 24, textAlign: 'center' as const, lineHeight: 24, marginLeft: 8, marginTop: 8 };
const chevronIconStyle = { fontSize: 14, color: '#666', lineHeight: 24, marginTop: 8 };

const SettingsIcon = (_props: any) => <Text style={settingsIconStyle}>⚙</Text>;
const HelpIcon = (_props: any) => <Text style={settingsIconStyle}>?</Text>;
const LogoutIcon = (_props: any) => <Text style={settingsIconStyle}>↗</Text>;
const ChevronIcon = (_props: any) => <Text style={chevronIconStyle}>›</Text>;

interface UserStats {
  albumsThisYear: number;
  albumsAllTime: number;
  ratingsThisYear: number;
  ratingsAllTime: number;
  followers: number;
  following: number;
}

interface RecentActivity {
  album: Album;
  listen: Listen;
  review?: Review;
}

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, isDarkMode } = useSelector((state: RootState) => state.auth);
  const currentTheme = isDarkMode ? theme.dark : theme.light;

  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    albumsThisYear: 0,
    albumsAllTime: 0,
    ratingsThisYear: 0,
    ratingsAllTime: 0,
    followers: 0,
    following: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadFavoriteAlbums = useCallback(async () => {
    if (!user?.preferences?.favoriteAlbumIds?.length) {
      setFavoriteAlbums([]);
      return;
    }

    try {
      // Mock: Get popular albums and use first few as favorites
      const response = await AlbumService.getPopularAlbums();
      if (response.success) {
        const mockFavorites = response.data.slice(0, user.preferences.favoriteAlbumIds.length);
        setFavoriteAlbums(mockFavorites);
      }
    } catch (error) {
      console.error('Error loading favorite albums:', error);
    }
  }, [user?.preferences?.favoriteAlbumIds]);

  const loadRecentActivity = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Mock: Get recent listens and reviews
      const response = await AlbumService.getPopularAlbums();
      if (response.success) {
        // Create mock recent activity
        const mockActivity: RecentActivity[] = response.data.slice(0, 5).map((album, index) => ({
          album,
          listen: {
            id: `listen_${index}`,
            userId: user.id,
            albumId: album.id,
            dateListened: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)), // Spread over last 5 days
            notes: undefined,
          },
          review: index % 2 === 0 ? {
            id: `review_${index}`,
            userId: user.id,
            albumId: album.id,
            rating: Math.floor(Math.random() * 5) + 1, // 1-5 stars
            reviewText: undefined,
            dateReviewed: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)),
            likesCount: 0,
            commentsCount: 0,
          } : undefined,
        }));

        setRecentActivity(mockActivity);
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }, [user?.id]);

  const loadUserStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Mock statistics
      const mockStats: UserStats = {
        albumsThisYear: Math.floor(Math.random() * 100) + 50,
        albumsAllTime: Math.floor(Math.random() * 500) + 200,
        ratingsThisYear: Math.floor(Math.random() * 80) + 30,
        ratingsAllTime: Math.floor(Math.random() * 400) + 150,
        followers: Math.floor(Math.random() * 200) + 50,
        following: Math.floor(Math.random() * 150) + 25,
      };
      setUserStats(mockStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadFavoriteAlbums(),
        loadRecentActivity(),
        loadUserStats(),
      ]);
      setLoading(false);
    };

    loadAllData();
  }, [loadFavoriteAlbums, loadRecentActivity, loadUserStats]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const navigateToFavoriteAlbumsManagement = () => {
    navigation.navigate('FavoriteAlbumsManagement');
  };

  const navigateToFollowers = () => {
    if (user) {
      navigation.navigate('Followers', { 
        userId: user.id, 
        username: user.username,
        initialTab: 'followers'
      });
    }
  };

  const navigateToFollowing = () => {
    if (user) {
      navigation.navigate('Followers', { 
        userId: user.id, 
        username: user.username,
        initialTab: 'following'
      });
    }
  };

  const navigateToListenedAlbums = (_timeframe: 'year' | 'alltime') => {
    if (user) {
      navigation.navigate('ListenedAlbums', { 
        userId: user.id, 
        username: user.username,
      });
    }
  };

  const navigateToUserReviews = (_timeframe: 'year' | 'alltime') => {
    if (user) {
      navigation.navigate('UserReviews', { 
        userId: user.id, 
        username: user.username,
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Text key={index} style={styles.star}>
        {index < rating ? '★' : '☆'}
      </Text>
    ));
  };

  const renderFavoriteAlbum = (album: Album) => (
    <TouchableOpacity
      key={album.id}
      style={styles.albumCard}
      onPress={() => navigateToAlbum(album.id)}
    >
      <Image source={{ uri: album.coverImageUrl }} style={styles.albumCover} />
      <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
        {album.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
        {album.artist}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentActivityItem = (activity: RecentActivity) => (
    <TouchableOpacity
      key={activity.album.id}
      style={styles.albumCard}
      onPress={() => navigateToAlbum(activity.album.id)}
    >
      <Image source={{ uri: activity.album.coverImageUrl }} style={styles.albumCover} />
      <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
        {activity.album.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
        {activity.album.artist}
      </Text>
      {activity.review && (
        <View style={styles.ratingContainer}>
          {renderStars(activity.review.rating)}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderStatCard = (title: string, value: number, onPress?: () => void) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: currentTheme.colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text variant="headlineMedium" style={styles.statValue}>
        {value.toLocaleString()}
      </Text>
      <Text variant="bodyMedium" style={styles.statLabel}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (!user || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Avatar.Image 
          size={80} 
          source={{ uri: user.profilePicture || 'https://via.placeholder.com/160x160/cccccc/999999?text=User' }}
          style={styles.profilePicture}
        />
        <Text variant="headlineMedium" style={styles.username}>
          @{user.username}
        </Text>
      </View>

      {/* Favorite Albums */}
      {favoriteAlbums.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              Favorite Albums
            </Text>
            <TouchableOpacity onPress={navigateToFavoriteAlbumsManagement}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {favoriteAlbums.map(renderFavoriteAlbum)}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Recent Activity
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {recentActivity.map(renderRecentActivityItem)}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.section}>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Stats & Social
        </Text>
        <View style={styles.statsGrid}>
          {renderStatCard('Albums This Year', userStats.albumsThisYear, () => navigateToListenedAlbums('year'))}
          {renderStatCard('Albums All Time', userStats.albumsAllTime, () => navigateToListenedAlbums('alltime'))}
          {renderStatCard('Ratings This Year', userStats.ratingsThisYear, () => navigateToUserReviews('year'))}
          {renderStatCard('Ratings All Time', userStats.ratingsAllTime, () => navigateToUserReviews('alltime'))}
          {renderStatCard('Followers', userStats.followers, navigateToFollowers)}
          {renderStatCard('Following', userStats.following, navigateToFollowing)}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Settings
        </Text>
        <List.Section>
          <List.Item
            title="Account Settings"
            left={SettingsIcon}
            right={ChevronIcon}
            onPress={() => {}}
          />
          <List.Item
            title="Help & Support"
            left={HelpIcon}
            right={ChevronIcon}
            onPress={() => {}}
          />
          <List.Item
            title="Logout"
            left={LogoutIcon}
            onPress={handleLogout}
          />
        </List.Section>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.light.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.light.colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.light.colors.onSurfaceVariant,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  profilePicture: {
    marginBottom: spacing.md,
  },
  username: {
    fontWeight: 'bold',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: 'bold',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  editButton: {
    color: theme.light.colors.primary,
    fontWeight: '600',
  },
  horizontalList: {
    flexDirection: 'row',
    paddingLeft: spacing.lg,
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
    marginRight: spacing.md,
  },
  albumCover: {
    width: ALBUM_CARD_WIDTH,
    height: ALBUM_CARD_WIDTH,
    borderRadius: 8,
    marginBottom: spacing.sm,
    resizeMode: 'cover',
  },
  albumTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  artistName: {
    color: theme.light.colors.onSurfaceVariant,
    lineHeight: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    justifyContent: 'center',
  },
  star: {
    fontSize: 12,
    color: theme.light.colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - spacing.lg * 3) / 3, // 3 columns with spacing
    aspectRatio: 1.2,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  statValue: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statLabel: {
    textAlign: 'center',
    color: theme.light.colors.onSurfaceVariant,
    fontSize: 12,
  },
});