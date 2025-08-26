import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { Text, Avatar, ActivityIndicator } from 'react-native-paper';
// SafeAreaView import removed - using regular View since header handles safe area
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';

import { ProfileStackParamList, Album, Listen, Review } from '../../types';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { setFollowers, setFollowing } from '../../store/slices/userSlice';
import { 
  fetchUserListeningHistory, 
  fetchUserAlbumStats,
  fetchUserRatedAlbums 
} from '../../store/slices/userAlbumsSlice';
import { AlbumService } from '../../services/albumService';
import { userService } from '../../services/userService';
import { theme, spacing, shadows } from '../../utils/theme';
import { SegmentedButtons } from 'react-native-paper';

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
  const { user } = useSelector((state: RootState) => state.auth);
  const { listeningHistory, stats: databaseStats, loading: userAlbumsLoading } = useSelector((state: RootState) => state.userAlbums);
  const isDarkMode = useColorScheme() === 'dark';
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
  const [initialLoadDone, setInitialLoadDone] = useState(false);

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

  const loadRecentActivity = useCallback(() => {
    if (!listeningHistory?.length) {
      setRecentActivity([]);
      return;
    }

    try {
      // Convert database listening history to recent activity format
      const activity: RecentActivity[] = listeningHistory.slice(0, 5).map(historyItem => {
        // Convert database album format to app Album format
        const album: Album = {
          id: historyItem.id,
          title: historyItem.name,
          artist: historyItem.artist_name,
          releaseDate: historyItem.release_date || '',
          genre: historyItem.genres || [],
          coverImageUrl: historyItem.image_url || '',
          spotifyUrl: historyItem.spotify_url || '',
          totalTracks: historyItem.total_tracks || 0,
          albumType: historyItem.album_type || 'album',
          trackList: [], // Empty for now, would be populated if needed
        };

        // Convert database interaction to app Listen format
        const listen: Listen = {
          id: historyItem.interaction?.id || `listen_${historyItem.id}`,
          userId: historyItem.interaction?.user_id || user?.id || '',
          albumId: historyItem.id,
          dateListened: new Date(historyItem.interaction?.listened_at || Date.now()),
        };

        // Convert database rating to app Review format if exists
        let review: Review | undefined;
        if (historyItem.interaction?.rating) {
          review = {
            id: `review_${historyItem.id}_${user?.id}`,
            userId: user?.id || '',
            albumId: historyItem.id,
            rating: historyItem.interaction.rating,
            review: historyItem.interaction.review || '',
            dateReviewed: new Date(historyItem.interaction.updated_at),
          };
        }

        return { album, listen, review };
      });

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error processing recent activity:', error);
      setRecentActivity([]);
    }
  }, [listeningHistory, user?.id]);

  const loadUserStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get social stats
      const [followersData, followingData] = await Promise.all([
        userService.getUserFollowers(user.id),
        userService.getUserFollowing(user.id),
      ]);
      
      // Update Redux store with social data
      dispatch(setFollowers(followersData.map(follower => ({
        ...follower,
        joinedDate: follower.joinedDate.toISOString(),
        lastActiveDate: follower.lastActiveDate.toISOString(),
      }))));
      dispatch(setFollowing(followingData.map(following => ({
        ...following,
        joinedDate: following.joinedDate.toISOString(),
        lastActiveDate: following.lastActiveDate.toISOString(),
      }))));
      
      // Use database stats if available
      if (databaseStats) {
        setUserStats({
          albumsThisYear: databaseStats.albumsThisYear,
          albumsAllTime: databaseStats.totalAlbums,
          ratingsThisYear: databaseStats.ratingsThisYear,
          ratingsAllTime: databaseStats.totalRatings,
          followers: followersData.length,
          following: followingData.length,
        });
      } else {
        // Fallback to basic stats when database stats aren't available
        setUserStats({
          albumsThisYear: 0,
          albumsAllTime: 0,
          ratingsThisYear: 0,
          ratingsAllTime: 0,
          followers: followersData.length,
          following: followingData.length,
        });
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, [user?.id, databaseStats, dispatch]);

  // Initial load effect - fetch data from database
  useEffect(() => {
    const loadAllData = async () => {
      if (!user || initialLoadDone) {
        return;
      }

      setLoading(true);
      try {
        // Fetch database data
        await Promise.all([
          dispatch(fetchUserListeningHistory({ userId: user.id, limit: 5 })),
          dispatch(fetchUserAlbumStats(user.id)),
          loadFavoriteAlbums(),
        ]);
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    };

    loadAllData();
  }, [user?.id, dispatch, loadFavoriteAlbums]); // Only depend on user ID

  // Update recent activity when listening history changes
  useEffect(() => {
    if (initialLoadDone) {
      loadRecentActivity();
    }
  }, [listeningHistory, loadRecentActivity, initialLoadDone]);

  // Update stats when database stats change
  useEffect(() => {
    if (initialLoadDone && user) {
      loadUserStats();
    }
  }, [databaseStats, loadUserStats, user, initialLoadDone]);

  // Reset when user changes
  useEffect(() => {
    setInitialLoadDone(false);
    setRecentActivity([]);
    setUserStats({
      albumsThisYear: 0,
      albumsAllTime: 0,
      ratingsThisYear: 0,
      ratingsAllTime: 0,
      followers: 0,
      following: 0,
    });
  }, [user?.id]);

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

  const renderRecentActivityItem = (activity: RecentActivity, index: number) => (
    <TouchableOpacity
      key={`${activity.album.id}-${activity.listen.id}-${index}`}
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
    <View style={styles.safeArea}>
      {/* Segmented Control */}
      <View style={[styles.segmentHeader, { backgroundColor: currentTheme.colors.surface, borderBottomColor: theme.colors.border }]}> 
        <SegmentedButtons
          value={'profile'}
          onValueChange={(v: any) => {
            if (v === 'diary') {
              navigation.replace('Diary', { userId: user.id, username: user.username });
            }
          }}
          buttons={[
            { value: 'profile', label: 'Profile' },
            { value: 'diary', label: 'Diary' },
          ]}
        />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never">
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
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Recently Listened
          </Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text variant="bodyMedium" style={styles.loadingText}>Loading recent activity...</Text>
            </View>
          ) : recentActivity.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.horizontalList}>
                {recentActivity.map((activity, index) => renderRecentActivityItem(activity, index))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyActivityContainer}>
              <Text variant="bodyLarge" style={styles.emptyActivityText}>
                No recent activity
              </Text>
              <Text variant="bodyMedium" style={styles.emptyActivitySubtext}>
                Start listening to some albums!
              </Text>
            </View>
          )}
        </View>

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
            {userStats.averageRating > 0 && renderStatCard('Average Rating', `★ ${userStats.averageRating}`, () => navigateToUserReviews('alltime'))}
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
  segmentHeader: {
    padding: spacing.md,
    backgroundColor: theme.light.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  emptyActivityContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.light.colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    ...shadows.small,
  },
  emptyActivityText: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  emptyActivitySubtext: {
    color: theme.light.colors.onSurfaceVariant,
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});