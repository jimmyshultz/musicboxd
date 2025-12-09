import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
  Alert,
} from 'react-native';

import { Text, Avatar, ActivityIndicator, Button, SegmentedButtons, useTheme, Menu, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { HomeStackParamList, SearchStackParamList, ProfileStackParamList, Album, Listen, Review, SerializedUser } from '../../types';
import { UserProfile } from '../../types/database';
import { HalfStarDisplay } from '../../components/HalfStarRating';
import { RootState } from '../../store';
import { addFollowing, removeFollowing } from '../../store/slices/userSlice';
import { userService } from '../../services/userService';
import { userStatsServiceV2 } from '../../services/userStatsServiceV2';
import { favoriteAlbumsService } from '../../services/favoriteAlbumsService';
import { blockService } from '../../services/blockService';
import { spacing, shadows } from '../../utils/theme';
import BannerAdComponent from '../../components/BannerAd';
import ReportModal from '../../components/ReportModal';

type UserProfileScreenRouteProp = RouteProp<HomeStackParamList | SearchStackParamList | ProfileStackParamList, 'UserProfile'>;
type UserProfileScreenNavigationProp = StackNavigationProp<HomeStackParamList | SearchStackParamList | ProfileStackParamList>;

const ALBUM_CARD_WIDTH = 120;
const STATS_CARDS_PER_ROW = 3;

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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  const { userId } = route.params;
  
  // Responsive spacing calculation for stats grid
  const STATS_HORIZONTAL_SPACING = Math.max(spacing.md, width * 0.04); // 4% of screen width, minimum 16
  const STATS_CARD_MARGIN = Math.max(spacing.xs, width * 0.015); // 1.5% of screen width, minimum 4
  
  const statCardWidth = (width - (STATS_HORIZONTAL_SPACING * 2) - (STATS_CARD_MARGIN * (STATS_CARDS_PER_ROW - 1))) / STATS_CARDS_PER_ROW;
  const styles = createStyles(theme, statCardWidth, STATS_HORIZONTAL_SPACING, STATS_CARD_MARGIN);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [user, setUser] = useState<UserProfile | null>(null);
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
  const [followActionType, setFollowActionType] = useState<'follow' | 'request' | 'requested' | 'following'>('follow');
  const [followLoading, setFollowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  

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

  const loadFavoriteAlbums = useCallback(async (userData: UserProfile) => {
    if (!userData?.id) {
      setFavoriteAlbums([]);
      return;
    }

    try {
      // Get favorite albums from database (limited to 5 ranked favorites)
      const favoriteAlbumsData = await favoriteAlbumsService.getUserFavoriteAlbums(userData.id, 5);
      
      // Convert to the Album format expected by the UI
      const albums = favoriteAlbumsData.map(favorite => ({
        id: favorite.albums.id,
        title: favorite.albums.name,
        artist: favorite.albums.artist_name,
        releaseDate: favorite.albums.release_date || '',
        genre: favorite.albums.genres || [],
        coverImageUrl: favorite.albums.image_url || '',
        spotifyUrl: favorite.albums.spotify_url || '',
        totalTracks: favorite.albums.total_tracks || 0,
        albumType: favorite.albums.album_type || 'album',
        trackList: [], // Empty for now
      }));
      
      setFavoriteAlbums(albums);
    } catch (error) {
      console.error('Error loading favorite albums:', error);
    }
  }, []);

  const loadRecentActivity = useCallback(async (userData: UserProfile) => {
    if (!userData?.id) return;

    try {
      const recentActivityData = await userStatsServiceV2.getRecentActivity(userData.id, 5);
      setRecentActivity(recentActivityData);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    }
  }, []);

  const loadUserStats = useCallback(async (userData: UserProfile) => {
    if (!userData?.id) return;

    try {
      console.log('UserProfile - Loading stats for user:', userData.id); // Debug log
      const stats = await userStatsServiceV2.getUserStats(userData.id);
      console.log('UserProfile - Stats loaded:', stats); // Debug log
      
      setUserStats({
        albumsThisYear: stats.albumsThisYear,
        albumsAllTime: stats.albumsAllTime,
        ratingsThisYear: stats.ratingsThisYear,
        ratingsAllTime: stats.ratingsAllTime,
        followers: stats.followers,
        following: stats.following,
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, []);

  const loadFollowActionType = useCallback(async () => {
    if (!currentUser || isOwnProfile) return;
    
    try {
      const actionType = await userService.getFollowActionType(currentUser.id, userId);
      setFollowActionType(actionType);
    } catch (error) {
      console.error('Error loading follow action type:', error);
    }
  }, [currentUser, userId, isOwnProfile]);

  const loadBlockStatus = useCallback(async () => {
    if (!currentUser || isOwnProfile) return;
    
    try {
      const blocked = await blockService.isBlocked(currentUser.id, userId);
      setIsBlocked(blocked);
    } catch (error) {
      console.error('Error loading block status:', error);
    }
  }, [currentUser, userId, isOwnProfile]);

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
          loadFollowActionType(),
          loadBlockStatus(),
        ]);
      }
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [initialLoadDone, loadUserProfile, loadFavoriteAlbums, loadRecentActivity, loadUserStats, loadFollowActionType, loadBlockStatus]);

  // Use focus effect to load data only when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone) {
        loadAllData();
      } else if (user) {
        // Refresh profile data when returning to screen
        loadRecentActivity(user);
        loadUserStats(user);
      }
    }, [loadAllData, initialLoadDone, user, loadRecentActivity, loadUserStats])
  );



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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const userData = await loadUserProfile();
      if (userData) {
        await Promise.all([
          loadFavoriteAlbums(userData),
          loadRecentActivity(userData),
          loadUserStats(userData),
          loadFollowActionType(),
        ]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadUserProfile, loadFavoriteAlbums, loadRecentActivity, loadUserStats, loadFollowActionType]);

  const handleFollowToggle = async () => {
    if (!user || !currentUser || followLoading) return;
    
    setFollowLoading(true);
    try {
      if (followActionType === 'following') {
        // Unfollow
        dispatch(removeFollowing(userId));
        await userService.unfollowUser(userId);
        setFollowActionType(user.is_private ? 'request' : 'follow');
      } else if (followActionType === 'requested') {
        // Cancel pending request
        await userService.unfollowUser(userId);
        setFollowActionType('request');
      } else {
        // Follow or send request
        const result = await userService.followUser(userId);
        
        if (result.type === 'followed') {
          // Direct follow - add to Redux store
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
          setFollowActionType('following');
        } else {
          // Request sent
          setFollowActionType('requested');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert optimistic UI changes if needed
      await loadFollowActionType();
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlockUser = () => {
    if (!user || !currentUser) return;
    
    Alert.alert(
      isBlocked ? 'Unblock User' : 'Block User',
      isBlocked 
        ? `Are you sure you want to unblock @${user.username}?`
        : `Are you sure you want to block @${user.username}? They won't be able to see your profile or interact with you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            setBlockLoading(true);
            setMenuVisible(false);
            try {
              if (isBlocked) {
                const result = await blockService.unblockUser(currentUser.id, userId);
                if (result.success) {
                  setIsBlocked(false);
                } else {
                  Alert.alert('Error', result.error || 'Failed to unblock user');
                }
              } else {
                const result = await blockService.blockUser(currentUser.id, userId);
                if (result.success) {
                  setIsBlocked(true);
                  // If we were following them, update the UI
                  if (followActionType === 'following') {
                    dispatch(removeFollowing(userId));
                    setFollowActionType(user.is_private ? 'request' : 'follow');
                  }
                } else {
                  Alert.alert('Error', result.error || 'Failed to block user');
                }
              }
            } catch (error) {
              console.error('Error toggling block:', error);
              Alert.alert('Error', 'Failed to update block status');
            } finally {
              setBlockLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReportUser = () => {
    setMenuVisible(false);
    setShowReportModal(true);
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
          <HalfStarDisplay rating={activity.review.rating} size="small" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderStatCard = (title: string, value: number, onPress?: () => void, index?: number) => {
    const isLastInRow = index !== undefined && (index + 1) % STATS_CARDS_PER_ROW === 0;
    return (
      <TouchableOpacity
        style={[
          styles.statCard, 
          { backgroundColor: theme.colors.surface },
          isLastInRow && styles.statCardLastInRow
        ]}
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
  };

  if (loading) {
    const loadingStyles = createStyles(theme);
    return (
      <View style={[loadingStyles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={loadingStyles.loadingText}>
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
      <View style={styles.segmentHeader}>
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

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Avatar.Image 
            size={80} 
            source={{ uri: user.avatar_url || 'https://via.placeholder.com/160x160/cccccc/999999?text=User' }}
            style={styles.profilePicture}
          />
          <Text variant="headlineMedium" style={styles.username}>
            @{user.username}
          </Text>
          
          {/* Follow Button and More Menu */}
          {!isOwnProfile && (
            <View style={styles.followContainer}>
              <Button
                mode={followActionType === 'following' ? "outlined" : "contained"}
                onPress={handleFollowToggle}
                style={styles.followButton}
                loading={followLoading}
                disabled={followLoading || isBlocked}
              >
                {followActionType === 'following' && "Following"}
                {followActionType === 'follow' && "Follow"}
                {followActionType === 'request' && "Request"}
                {followActionType === 'requested' && "Requested"}
              </Button>
              
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={24}
                    onPress={() => setMenuVisible(true)}
                    style={styles.moreButton}
                  />
                }
              >
                <Menu.Item
                  onPress={handleBlockUser}
                  title={isBlocked ? "Unblock User" : "Block User"}
                  leadingIcon={isBlocked ? "account-check" : "account-cancel"}
                />
                <Menu.Item
                  onPress={handleReportUser}
                  title="Report User"
                  leadingIcon="flag"
                />
              </Menu>
            </View>
          )}
          
          {/* Show blocked status */}
          {isBlocked && (
            <Text variant="bodySmall" style={styles.blockedText}>
              You have blocked this user
            </Text>
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

        {/* Banner Ad */}
        <View style={styles.adContainer}>
          <BannerAdComponent />
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Stats & Social
          </Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Albums This Year', userStats.albumsThisYear, () => navigateToListenedAlbums('year'), 0)}
            {renderStatCard('Albums All Time', userStats.albumsAllTime, () => navigateToListenedAlbums('alltime'), 1)}
            {renderStatCard('Ratings This Year', userStats.ratingsThisYear, () => navigateToUserReviews('year'), 2)}
            {renderStatCard('Ratings All Time', userStats.ratingsAllTime, () => navigateToUserReviews('alltime'), 3)}
            {renderStatCard('Followers', userStats.followers, navigateToFollowers, 4)}
            {renderStatCard('Following', userStats.following, navigateToFollowing, 5)}
          </View>
        </View>
      </ScrollView>

      {/* Report Modal */}
      {currentUser && user && (
        <ReportModal
          visible={showReportModal}
          onDismiss={() => setShowReportModal(false)}
          reporterId={currentUser.id}
          reportedUserId={user.id}
          reportedUsername={user.username}
          contentType="profile"
          onReportSubmitted={() => setShowReportModal(false)}
        />
      )}
    </View>
  );
}

const createStyles = (theme: any, statCardWidth: number, statsHorizontalSpacing: number, statsCardMargin: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },

  segmentHeader: {
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  followButton: {
    minWidth: 120,
  },
  moreButton: {
    marginLeft: spacing.xs,
  },
  blockedText: {
    color: theme.colors.error,
    marginTop: spacing.sm,
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
    color: theme.colors.onSurfaceVariant,
    lineHeight: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    justifyContent: 'flex-start',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: statsHorizontalSpacing,
    justifyContent: 'flex-start',
  },
  statCard: {
    width: statCardWidth,
    aspectRatio: 1.2,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginRight: statsCardMargin,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  statCardLastInRow: {
    marginRight: 0,
  },
  statValue: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statLabel: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  emptyFavoritesContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    ...shadows.small,
  },
  emptyFavoritesText: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  emptyFavoritesSubtext: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontSize: 14,
  },
  emptyActivityContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    ...shadows.small,
  },
  emptyActivityText: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  emptyActivitySubtext: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  adContainer: {
    marginVertical: spacing.lg,
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
});