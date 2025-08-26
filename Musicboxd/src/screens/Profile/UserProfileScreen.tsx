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

import { Text, Avatar, ActivityIndicator, Button, SegmentedButtons } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { HomeStackParamList, SearchStackParamList, ProfileStackParamList, Album, Listen, Review, User, SerializedUser } from '../../types';
import { RootState } from '../../store';
import { addFollowing, removeFollowing } from '../../store/slices/userSlice';
import { 
  fetchUserListeningHistory, 
  fetchUserAlbumStats 
} from '../../store/slices/userAlbumsSlice';
import { AlbumService } from '../../services/albumService';
import { userService } from '../../services/userService';
import { theme, spacing, shadows } from '../../utils/theme';

type UserProfileScreenRouteProp = RouteProp<HomeStackParamList | SearchStackParamList | ProfileStackParamList, 'UserProfile'>;
type UserProfileScreenNavigationProp = StackNavigationProp<HomeStackParamList | SearchStackParamList | ProfileStackParamList>;

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = 120;


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

export default function UserProfileScreen() {
  const route = useRoute<UserProfileScreenRouteProp>();
  const navigation = useNavigation<UserProfileScreenNavigationProp>();
  const dispatch = useDispatch();
  const isDarkMode = useColorScheme() === 'dark';
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const insets = useSafeAreaInsets();
  
  const { userId } = route.params;
  const { following } = useSelector((state: RootState) => state.user);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { userListens, userReviews } = useSelector((state: RootState) => state.albums);
  const { listeningHistory: currentUserListeningHistory, stats: currentUserStats } = useSelector((state: RootState) => state.userAlbums);
  
  const [user, setUser] = useState<User | null>(null);
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
  
  const isFollowing = useMemo(() => 
    following.some(followedUser => followedUser.id === userId), 
    [following, userId]
  );
  const isOwnProfile = useMemo(() => 
    currentUser?.id === userId, 
    [currentUser?.id, userId]
  );

  const loadUserProfile = useCallback(async () => {
    if (!userId) return;
    
    try {
      const userData = await userService.getUserById(userId);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }, [userId]);

  const loadFavoriteAlbums = useCallback(async (userData: User) => {
    if (!userData?.preferences?.favoriteAlbumIds?.length) {
      setFavoriteAlbums([]);
      return;
    }

    try {
      // Get the actual albums matching the user's favorite IDs
      const albumPromises = userData.preferences.favoriteAlbumIds.map(albumId => 
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
  }, []);

  const loadRecentActivity = useCallback(async (userData: User) => {
    if (!userData?.id) return;

    try {
      let recentActivityData: RecentActivity[] = [];
      
      // Check if this is the current user
      if (userData.id === currentUser?.id && currentUserListeningHistory?.length) {
        // For current user, use Redux data if available
        recentActivityData = currentUserListeningHistory.slice(0, 5).map(historyItem => {
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
            trackList: [], // Empty for now
          };

          // Convert database interaction to app Listen format
          const listen: Listen = {
            id: historyItem.interaction?.id || `listen_${historyItem.id}`,
            userId: historyItem.interaction?.user_id || userData.id,
            albumId: historyItem.id,
            dateListened: new Date(historyItem.interaction?.listened_at || Date.now()),
          };

          // Convert database rating to app Review format if exists
          let review: Review | undefined;
          if (historyItem.interaction?.rating) {
            review = {
              id: `review_${historyItem.id}_${userData.id}`,
              userId: userData.id,
              albumId: historyItem.id,
              rating: historyItem.interaction.rating,
              review: historyItem.interaction.review || '',
              dateReviewed: new Date(historyItem.interaction.updated_at),
            };
          }

          return { album, listen, review };
        });
      } else {
        // For other users, fetch their data from the API using userAlbumsService
        const { userAlbumsService } = await import('../../services/userAlbumsService');
        const listeningHistory = await userAlbumsService.getUserListeningHistory(userData.id, 5);
        
        recentActivityData = listeningHistory.map(historyItem => {
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
            trackList: [], // Empty for now
          };

          // Convert database interaction to app Listen format
          const listen: Listen = {
            id: historyItem.interaction?.id || `listen_${historyItem.id}`,
            userId: historyItem.interaction?.user_id || userData.id,
            albumId: historyItem.id,
            dateListened: new Date(historyItem.interaction?.listened_at || Date.now()),
          };

          // Convert database rating to app Review format if exists
          let review: Review | undefined;
          if (historyItem.interaction?.rating) {
            review = {
              id: `review_${historyItem.id}_${userData.id}`,
              userId: userData.id,
              albumId: historyItem.id,
              rating: historyItem.interaction.rating,
              review: historyItem.interaction.review || '',
              dateReviewed: new Date(historyItem.interaction.updated_at),
            };
          }

          return { album, listen, review };
        });
      }

      setRecentActivity(recentActivityData);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    }
  }, [currentUser?.id, currentUserListeningHistory]);

  const loadUserStats = useCallback(async (userData: User) => {
    if (!userData?.id) return;

    try {
      let stats: UserStats;
      
      // Check if this is the current user
      if (userData.id === currentUser?.id && currentUserStats) {
        // For current user, use Redux stats if available
        const [followersData, followingData] = await Promise.all([
          userService.getUserFollowers(userData.id),
          userService.getUserFollowing(userData.id),
        ]);
        
        stats = {
          albumsThisYear: currentUserStats.albumsThisYear,
          albumsAllTime: currentUserStats.totalAlbums,
          ratingsThisYear: currentUserStats.ratingsThisYear,
          ratingsAllTime: currentUserStats.totalRatings,
          followers: followersData.length,
          following: followingData.length,
        };
      } else {
        // For other users, fetch their stats from the API
        const { userAlbumsService } = await import('../../services/userAlbumsService');
        const [albumStats, followersData, followingData] = await Promise.all([
          userAlbumsService.getUserAlbumStats(userData.id),
          userService.getUserFollowers(userData.id),
          userService.getUserFollowing(userData.id),
        ]);
        
        stats = {
          albumsThisYear: albumStats.albumsThisYear,
          albumsAllTime: albumStats.totalAlbums,
          ratingsThisYear: albumStats.ratingsThisYear,
          ratingsAllTime: albumStats.totalRatings,
          followers: followersData.length,
          following: followingData.length,
        };
      }
      
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, [currentUser?.id, currentUserStats]);

  // Main load function that loads all data in sequence
  const loadAllData = useCallback(async () => {
    if (initialLoadDone) return;
    
    setLoading(true);
    try {
      const userData = await loadUserProfile();
      if (userData) {
        await Promise.all([
          loadFavoriteAlbums(userData),
          loadRecentActivity(userData),
          loadUserStats(userData),
        ]);
      }
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [initialLoadDone, loadUserProfile, loadFavoriteAlbums, loadRecentActivity, loadUserStats]);

  // Use focus effect to load data only when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone) {
        // If viewing own profile, also fetch database data
        if (isOwnProfile && currentUser) {
          dispatch(fetchUserListeningHistory({ userId: currentUser.id, limit: 5 }));
          dispatch(fetchUserAlbumStats(currentUser.id));
        }
        loadAllData();
      }
    }, [loadAllData, initialLoadDone, isOwnProfile, currentUser, dispatch])
  );

  // Separate effect to handle Redux state changes for current user's profile
  useEffect(() => {
    if (!user || !initialLoadDone || !isOwnProfile) return;

    // Update recent activity and stats when Redux state changes for own profile
    loadRecentActivity(user);
    loadUserStats(user);
  }, [user, initialLoadDone, isOwnProfile, loadRecentActivity, loadUserStats]);

  // Reset initial load flag when userId changes
  useEffect(() => {
    setInitialLoadDone(false);
    setUser(null);
    setFavoriteAlbums([]);
    setRecentActivity([]);
    setUserStats({
      albumsThisYear: 0,
      albumsAllTime: 0,
      ratingsThisYear: 0,
      ratingsAllTime: 0,
      followers: 0,
      following: 0,
    });
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!user) return;
    
    try {
      if (isFollowing) {
        dispatch(removeFollowing(userId));
        await userService.unfollowUser(userId);
      } else {
        // Convert Date objects to strings to avoid Redux serialization issues
        const serializedUser: SerializedUser = {
          ...user,
          joinedDate: user.joinedDate.toISOString(),
          lastActiveDate: user.lastActiveDate.toISOString(),
        };
        dispatch(addFollowing(serializedUser));
        await userService.followUser(userId);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
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

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text variant="bodyLarge" style={styles.loadingText}>
          User not found.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={[styles.segmentHeader, { backgroundColor: currentTheme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <SegmentedButtons
          value={'profile'}
          onValueChange={(v: any) => {
            if (v === 'diary' && user) {
              navigation.navigate('Diary', { userId: user.id, username: user.username });
            }
          }}
          buttons={[
            { value: 'profile', label: 'Profile' },
            { value: 'diary', label: 'Diary' },
          ]}
        />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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

        {/* Favorite Albums */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Favorite Albums
          </Text>
          {favoriteAlbums.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.horizontalList}>
                {favoriteAlbums.map(renderFavoriteAlbum)}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyFavoritesContainer}>
              <Text variant="bodyLarge" style={styles.emptyFavoritesText}>
                No favorite albums yet
              </Text>
              <Text variant="bodyMedium" style={styles.emptyFavoritesSubtext}>
                This user hasn't selected their favorite albums
              </Text>
            </View>
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
                {isOwnProfile ? "Start listening to some albums!" : "This user hasn't listened to any albums recently"}
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
            {renderStatCard('Followers', userStats.followers, navigateToFollowers)}
            {renderStatCard('Following', userStats.following, navigateToFollowing)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.light.colors.background,
  },
  scrollContainer: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: theme.light.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  segmentHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
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
    marginBottom: spacing.md,
  },
  followContainer: {
    marginTop: spacing.md,
  },
  followButton: {
    minWidth: 120,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontWeight: 'bold',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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