import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text, Avatar, ActivityIndicator } from 'react-native-paper';
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
const chevronIconStyle = { fontSize: 14, color: '#666', lineHeight: 24, marginTop: 8 };

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
  const { userListens, userReviews } = useSelector((state: RootState) => state.albums);
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
      // Get the actual albums matching the user's favorite IDs
      const albumPromises = user.preferences.favoriteAlbumIds.map(albumId => 
        AlbumService.getAlbumById(albumId)
      );
      
      const albumResponses = await Promise.all(albumPromises);
      const favorites: Album[] = [];
      
      albumResponses.forEach(response => {
        if (response.success && response.data) {
          favorites.push(response.data);
        }
      });
      
      setFavoriteAlbums(favorites);
    } catch (error) {
      console.error('Error loading favorite albums:', error);
    }
  }, [user?.preferences?.favoriteAlbumIds]);

  const loadRecentActivity = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Use Redux state for user listens and reviews
      const currentUserListens = userListens.filter(listen => listen.userId === user.id);
      const currentUserReviews = userReviews.filter(review => review.userId === user.id);

      // Get 5 most recent listens
      const recentListens = currentUserListens
        .sort((a, b) => new Date(b.dateListened).getTime() - new Date(a.dateListened).getTime())
        .slice(0, 5);

      // Get albums for the recent listens
      const albumPromises = recentListens.map(listen => 
        AlbumService.getAlbumById(listen.albumId)
      );
      
      const albumResponses = await Promise.all(albumPromises);
      
      // Create activity items with actual user data
      const activity: RecentActivity[] = [];
      
      recentListens.forEach((listen, index) => {
        const albumResponse = albumResponses[index];
        if (albumResponse.success && albumResponse.data) {
          const correspondingReview = currentUserReviews.find(
            review => review.albumId === listen.albumId
          );
          
          activity.push({
            album: albumResponse.data,
            listen,
            review: correspondingReview,
          });
        }
      });

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }, [user?.id, userListens, userReviews]);

  const loadUserStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Use Redux state for user listens and reviews
      const currentUserListens = userListens.filter(listen => listen.userId === user.id);
      const currentUserReviews = userReviews.filter(review => review.userId === user.id);
      
      // Calculate this year's stats (mock for now - in real app would filter by date)
      const thisYearAlbums = Math.floor(currentUserListens.length * 0.6); // Assume 60% were this year
      const thisYearRatings = Math.floor(currentUserReviews.length * 0.6);
      
      const mockStats: UserStats = {
        albumsThisYear: thisYearAlbums,
        albumsAllTime: currentUserListens.length,
        ratingsThisYear: thisYearRatings,
        ratingsAllTime: currentUserReviews.length,
        // Mock social stats (would come from user service in real app)
        followers: Math.floor(Math.random() * 200) + 50,
        following: Math.floor(Math.random() * 150) + 25,
      };
      setUserStats(mockStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, [user?.id, userListens, userReviews]);

  useEffect(() => {
    const loadAllData = async () => {
      // Only load data if user exists
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        loadFavoriteAlbums(),
        loadRecentActivity(),
        loadUserStats(),
      ]);
      setLoading(false);
    };

    loadAllData();
  }, [user, loadFavoriteAlbums, loadRecentActivity, loadUserStats]);

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

  if (loading && user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  // This case should never happen with proper auth flow, but just in case
  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="bodyLarge" style={styles.loadingText}>
          Please log in to view your profile.
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
      <View style={styles.section}>
        <View style={styles.sectionHeaderWithButton}>
          <Text variant="headlineSmall" style={styles.sectionTitleInHeader}>
            Favorite Albums
          </Text>
          <TouchableOpacity onPress={navigateToFavoriteAlbumsManagement}>
            <Text style={styles.editButton}>
              {favoriteAlbums.length > 0 ? 'Edit' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>
        {favoriteAlbums.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {favoriteAlbums.map(renderFavoriteAlbum)}
            </View>
          </ScrollView>
        ) : (
          <TouchableOpacity
            style={styles.emptyFavoritesContainer}
            onPress={navigateToFavoriteAlbumsManagement}
          >
            <Text variant="bodyLarge" style={styles.emptyFavoritesText}>
              Add your five favorite albums
            </Text>
            <Text variant="bodyMedium" style={styles.emptyFavoritesSubtext}>
              Tap to select albums that define your music taste
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
        <View style={styles.settingsContainer}>
          <TouchableOpacity style={styles.settingsItem} onPress={() => {}}>
            <Text style={styles.settingsText}>Account Settings</Text>
            <ChevronIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => {}}>
            <Text style={styles.settingsText}>Help & Support</Text>
            <ChevronIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
            <Text style={styles.settingsText}>Logout</Text>
          </TouchableOpacity>
        </View>
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
  sectionHeaderWithButton: {
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
  sectionTitleInHeader: {
    fontWeight: 'bold',
    paddingBottom: 0, // Container handles bottom padding
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
    justifyContent: 'flex-start',
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
  settingsContainer: {
    paddingHorizontal: spacing.lg,
  },
  settingsText: {
    fontSize: 16,
    color: theme.light.colors.onSurface,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44, // Maintain touchable area
  },
  emptyFavoritesContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.light.colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    ...shadows.small,
  },
  emptyFavoritesText: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  emptyFavoritesSubtext: {
    color: theme.light.colors.onSurfaceVariant,
    textAlign: 'center',
    fontSize: 14,
  },
});