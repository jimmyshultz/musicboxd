import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { Text, ActivityIndicator, Avatar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { HomeStackParamList, Album } from '../../types';
import { UserProfile } from '../../types/database';
import { RootState } from '../../store';
import Icon from 'react-native-vector-icons/FontAwesome';
import { fetchAlbumsStart, fetchAlbumsSuccess } from '../../store/slices/albumSlice';
import { AlbumService } from '../../services/albumService';
import { userService } from '../../services/userService';
import { diaryService } from '../../services/diaryService';
import { spacing } from '../../utils/theme';
import BannerAdComponent from '../../components/BannerAd';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList>;

const ALBUM_CARD_WIDTH = 120;
const USER_CARD_WIDTH = 140;

interface FriendActivity {
  album: Album;
  originalAlbumId: string; // Store original album ID for navigation
  diaryEntryId: string; // Store diary entry ID for navigation
  friend: {
    id: string;
    username: string;
    profilePicture?: string;
  };
  diaryDate: Date;
  rating?: number;
  notes?: string;
}

interface FriendPopularAlbum {
  album: Album;
  friendsWhoListened: {
    id: string;
    username: string;
    profilePicture?: string;
  }[];
  totalFriends: number;
}

interface PotentialFriend {
  user: UserProfile;
  mutualFollowers: number;
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
  const theme = useTheme();

  const { loading } = useSelector((state: RootState) => state.albums);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const [popularThisWeek, setPopularThisWeek] = useState<Album[]>([]);
  const [newFromFriends, setNewFromFriends] = useState<FriendActivity[]>([]);
  const [popularWithFriends, setPopularWithFriends] = useState<FriendPopularAlbum[]>([]);
  const [discoverFriends, setDiscoverFriends] = useState<PotentialFriend[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    popularThisWeek: true,
    newFromFriends: true,
    popularWithFriends: true,
    discoverFriends: true,
  });

  const styles = createStyles(theme);

  const loadPopularThisWeek = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, popularThisWeek: true }));
      // Get popular albums for this week
      const response = await AlbumService.getPopularAlbums();
      if (response.success) {
        // Get unique albums without modification
        const uniqueAlbums = response.data.slice(0, 20);
        setPopularThisWeek(uniqueAlbums);
      }
    } catch (error) {
      console.error('Error loading popular this week:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, popularThisWeek: false }));
    }
  }, []);

  const loadNewFromFriends = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, newFromFriends: true }));
      const currentUserId = currentUser?.id;
      if (!currentUserId) {
        setNewFromFriends([]);
        setLoadingStates(prev => ({ ...prev, newFromFriends: false }));
        return;
      }

      // Get users that current user is actually following
      const users = await userService.getUserFollowing(currentUserId);

      // Filter out current user from friends list
      const currentUsername = currentUser?.username || 'musiclover2024';
      const friendsOnly = users.filter(user => user.username !== currentUsername);

      // Early return if no friends available
      if (friendsOnly.length === 0) {
        setNewFromFriends([]);
        setLoadingStates(prev => ({ ...prev, newFromFriends: false }));
        return;
      }

      const friendActivities: FriendActivity[] = [];

      // Get real diary entries for each friend - Process in parallel
      const diaryPromises = friendsOnly.map(async (friend) => {
        try {
          const userDiaryEntries = await diaryService.getUserDiaryEntriesWithAlbums(friend.id);

          if (userDiaryEntries.length > 0) {
            // Get the 3 most recent diary entries for this friend
            const recentEntries = userDiaryEntries
              .sort((a, b) => new Date(b.diary_date).getTime() - new Date(a.diary_date).getTime())
              .slice(0, 3);

            // Create activities for each recent diary entry
            return recentEntries.map(entry => {
              if (entry.albums) {
                const album: Album = {
                  id: entry.albums.id,
                  title: entry.albums.name,
                  artist: entry.albums.artist_name,
                  releaseDate: entry.albums.release_date || '',
                  genre: entry.albums.genres || [],
                  coverImageUrl: entry.albums.image_url || '',
                  spotifyUrl: entry.albums.spotify_url || '',
                  totalTracks: entry.albums.total_tracks || 0,
                  albumType: entry.albums.album_type || 'album',
                  trackList: [], // Empty for now
                };

                return {
                  album: {
                    ...album,
                    // Use unique ID for each activity instance to allow duplicates
                    id: album.id + '_friend_activity_' + friend.id + '_' + entry.id,
                  },
                  originalAlbumId: album.id, // Store original album ID for navigation
                  diaryEntryId: entry.id, // Store diary entry ID for diary navigation
                  friend: {
                    id: friend.id,
                    username: friend.username,
                    profilePicture: friend.avatar_url,
                  },
                  diaryDate: new Date(entry.diary_date),
                  rating: entry.rating,
                  notes: entry.notes,
                };
              }
              return null;
            }).filter(Boolean) as FriendActivity[];
          }
          return [];
        } catch (error) {
          console.error(`Error loading diary entries for friend ${friend.username}:`, error);
          return [];
        }
      });

      const results = await Promise.all(diaryPromises);
      results.forEach(activities => friendActivities.push(...activities));

      // Sort by most recent first and limit to 10 total activities for home page preview
      friendActivities.sort((a, b) => b.diaryDate.getTime() - a.diaryDate.getTime());
      setNewFromFriends(friendActivities.slice(0, 10));
    } catch (error) {
      console.error('Error loading new from friends:', error);
      setNewFromFriends([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, newFromFriends: false }));
    }
  }, [currentUser]);

  const loadPopularWithFriends = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, popularWithFriends: true }));
      const currentUserId = currentUser?.id;
      if (!currentUserId) {
        setPopularWithFriends([]);
        setLoadingStates(prev => ({ ...prev, popularWithFriends: false }));
        return;
      }

      // Get users that current user is actually following
      const users = await userService.getUserFollowing(currentUserId);

      // Filter out current user from friends list
      const currentUsername = currentUser?.username || 'musiclover2024';
      const friendsOnly = users.filter(user => user.username !== currentUsername);

      // Early return if no friends available
      if (friendsOnly.length === 0) {
        setPopularWithFriends([]);
        setLoadingStates(prev => ({ ...prev, popularWithFriends: false }));
        return;
      }

      // Track album popularity: albumId -> { album, friendsWhoListened: Set<friendId> }
      const albumPopularity = new Map<string, {
        album: Album;
        friendsWhoListened: Set<string>;
        friendData: { id: string; username: string; profilePicture?: string; }[];
      }>();

      // Fetch all friends' listens in parallel
      const friendListensPromises = friendsOnly.map(friend =>
        AlbumService.getUserListens(friend.id).catch(error => {
          console.error(`Error loading listens for friend ${friend.username}:`, error);
          return [];
        })
      );

      const allFriendsListens = await Promise.all(friendListensPromises);

      // Collect all unique album IDs
      const allAlbumIds = new Set<string>();
      allFriendsListens.forEach(listens => {
        listens.forEach(listen => allAlbumIds.add(listen.albumId));
      });

      if (allAlbumIds.size === 0) {
        setPopularWithFriends([]);
        setLoadingStates(prev => ({ ...prev, popularWithFriends: false }));
        return;
      }

      // Batch query albums from database
      const { supabase } = await import('../../services/supabase');
      const { data: dbAlbums, error: dbError } = await supabase
        .from('albums')
        .select('*')
        .in('id', Array.from(allAlbumIds));

      if (dbError) {
        console.error('Error fetching albums from database:', dbError);
      }

      // Create a map of albums from database
      const albumsMap = new Map<string, Album>();
      dbAlbums?.forEach(dbAlbum => {
        albumsMap.set(dbAlbum.id, {
          id: dbAlbum.id,
          title: dbAlbum.name,
          artist: dbAlbum.artist_name,
          releaseDate: dbAlbum.release_date || '',
          genre: dbAlbum.genres || [],
          coverImageUrl: dbAlbum.image_url || '',
          spotifyUrl: dbAlbum.spotify_url || '',
          totalTracks: dbAlbum.total_tracks || 0,
          albumType: dbAlbum.album_type || 'album',
          trackList: [],
        });
      });

      // Process each friend's listens
      allFriendsListens.forEach((listens, index) => {
        const friend = friendsOnly[index];

        listens.forEach(listen => {
          const album = albumsMap.get(listen.albumId);
          if (!album) return; // Skip if album not in database

          // Get or create album entry
          if (!albumPopularity.has(listen.albumId)) {
            albumPopularity.set(listen.albumId, {
              album,
              friendsWhoListened: new Set(),
              friendData: [],
            });
          }

          const entry = albumPopularity.get(listen.albumId)!;
          // Add friend to this album's listeners
          if (!entry.friendsWhoListened.has(friend.id)) {
            entry.friendsWhoListened.add(friend.id);
            entry.friendData.push({
              id: friend.id,
              username: friend.username,
              profilePicture: friend.avatar_url,
            });
          }
        });
      });

      // Convert to FriendPopularAlbum array and filter albums with multiple listeners
      const friendPopularAlbums: FriendPopularAlbum[] = [];

      albumPopularity.forEach((entry, _albumId) => {
        // Only include albums that have been listened to by 1+ friends
        if (entry.friendsWhoListened.size >= 1) {
          friendPopularAlbums.push({
            album: entry.album,
            friendsWhoListened: entry.friendData.slice(0, 3), // Show max 3 for UI
            totalFriends: entry.friendsWhoListened.size,
          });
        }
      });

      // Sort by number of friends who listened (descending) and limit to 20
      friendPopularAlbums.sort((a, b) => b.totalFriends - a.totalFriends);
      setPopularWithFriends(friendPopularAlbums.slice(0, 20));
    } catch (error) {
      console.error('Error loading popular with friends:', error);
      setPopularWithFriends([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, popularWithFriends: false }));
    }
  }, [currentUser]);

  const loadDiscoverFriends = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, discoverFriends: true }));
      const currentUserId = currentUser?.id;
      if (!currentUserId) {
        setDiscoverFriends([]);
        setLoadingStates(prev => ({ ...prev, discoverFriends: false }));
        return;
      }

      const users = await userService.getSuggestedUsers(currentUserId, 20);

      if (users.length > 0) {
        // Filter out current user from potential friends
        const currentUsername = currentUser?.username || 'musiclover2024';
        const potentialUsers = users.filter(user => user.username !== currentUsername);

        if (potentialUsers.length === 0) {
          setDiscoverFriends([]);
          setLoadingStates(prev => ({ ...prev, discoverFriends: false }));
          return;
        }

        // Calculate mutual followers for all users in parallel
        const mutualFollowerPromises = potentialUsers.map(async (user) => {
          try {
            const mutualFollowersCount = await userService.getMutualFollowersCount(currentUserId, user.id);
            return {
              user,
              mutualFollowers: mutualFollowersCount,
            };
          } catch (error) {
            console.error(`Error calculating mutual followers for user ${user.username}:`, error);
            // If calculation fails, still include the user but with 0 mutual followers
            return {
              user,
              mutualFollowers: 0,
            };
          }
        });

        const potentialFriends = await Promise.all(mutualFollowerPromises);

        // Sort by mutual followers count (descending) and limit to 20
        potentialFriends.sort((a, b) => b.mutualFollowers - a.mutualFollowers);
        setDiscoverFriends(potentialFriends.slice(0, 20));
      } else {
        setDiscoverFriends([]);
      }
    } catch (error) {
      console.error('Error loading discover friends:', error);
      setDiscoverFriends([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, discoverFriends: false }));
    }
  }, [currentUser]);

  useEffect(() => {
    dispatch(fetchAlbumsStart());
    // Load sections independently - don't wait for all to complete
    loadPopularThisWeek();
    loadNewFromFriends();
    loadPopularWithFriends();
    loadDiscoverFriends();

    // Mark albums as loaded after a short delay (sections load independently)
    setTimeout(() => {
      dispatch(fetchAlbumsSuccess([]));
    }, 100);
  }, [dispatch, loadPopularThisWeek, loadNewFromFriends, loadPopularWithFriends, loadDiscoverFriends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPopularThisWeek(),
        loadNewFromFriends(),
        loadPopularWithFriends(),
        loadDiscoverFriends(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadPopularThisWeek, loadNewFromFriends, loadPopularWithFriends, loadDiscoverFriends]);

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const navigateToUserProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const navigateToDiaryEntry = (entryId: string, userId: string) => {
    navigation.navigate('DiaryEntryDetails', { entryId, userId });
  };

  const renderSectionHeader = (title: string, onSeeAll?: () => void) => (
    <View style={styles.sectionHeader}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
          <Icon name="chevron-right" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAlbumCard = (album: Album) => (
    <TouchableOpacity
      key={album.id}
      style={styles.albumCard}
      onPress={() => navigateToAlbum(album.id)}
    >
      <FastImage
        source={{ uri: album.coverImageUrl, priority: FastImage.priority.normal }}
        style={styles.albumCover}
        resizeMode={FastImage.resizeMode.cover}
      />
      <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
        {album.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
        {album.artist}
      </Text>
    </TouchableOpacity>
  );

  const renderFriendActivityCard = (activity: FriendActivity) => (
    <TouchableOpacity
      key={`${activity.friend.id}-${activity.album.id}-${activity.diaryEntryId}`}
      style={styles.albumCard}
      onPress={() => navigateToDiaryEntry(activity.diaryEntryId, activity.friend.id)}
    >
      <FastImage
        source={{ uri: activity.album.coverImageUrl, priority: FastImage.priority.normal }}
        style={styles.albumCover}
        resizeMode={FastImage.resizeMode.cover}
      />
      <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
        {activity.album.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
        {activity.album.artist}
      </Text>
      <View style={styles.friendBadge}>
        <Avatar.Image
          size={16}
          source={{ uri: activity.friend.profilePicture || 'https://via.placeholder.com/32x32/cccccc/999999?text=U' }}
        />
        <Text variant="bodySmall" style={styles.friendBadgeText}>
          @{activity.friend.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPopularWithFriendsCard = (popularAlbum: FriendPopularAlbum) => (
    <TouchableOpacity
      key={`popular-${popularAlbum.album.id}-${popularAlbum.totalFriends}`}
      style={styles.albumCard}
      onPress={() => navigateToAlbum(popularAlbum.album.id)}
    >
      <FastImage
        source={{ uri: popularAlbum.album.coverImageUrl, priority: FastImage.priority.normal }}
        style={styles.albumCover}
        resizeMode={FastImage.resizeMode.cover}
      />
      <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
        {popularAlbum.album.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
        {popularAlbum.album.artist}
      </Text>
      <View style={styles.friendsCounter}>
        <Text variant="bodySmall" style={styles.friendsCountText}>
          {popularAlbum.totalFriends} friends
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPotentialFriendCard = (potentialFriend: PotentialFriend) => (
    <TouchableOpacity
      key={potentialFriend.user.id}
      style={styles.userCard}
      onPress={() => navigateToUserProfile(potentialFriend.user.id)}
    >
      <Avatar.Image
        size={60}
        source={{ uri: potentialFriend.user.avatar_url || 'https://via.placeholder.com/120x120/cccccc/999999?text=User' }}
      />
      <Text variant="bodySmall" numberOfLines={1} style={styles.username}>
        @{potentialFriend.user.username}
      </Text>
      <Text variant="bodySmall" style={styles.mutualFollowers}>
        {potentialFriend.mutualFollowers} mutual followers
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading your feed...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Popular This Week */}
      <View style={styles.section}>
        {renderSectionHeader('Popular This Week', () => navigation.navigate('PopularThisWeek'))}
        {loadingStates.popularThisWeek && popularThisWeek.length === 0 ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" />
            <Text variant="bodySmall" style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {popularThisWeek.map(renderAlbumCard)}
            </View>
          </ScrollView>
        )}
      </View>

      {/* New From Friends */}
      <View style={styles.section}>
        {renderSectionHeader('New From Friends', () => navigation.navigate('NewFromFriends'))}
        {loadingStates.newFromFriends && newFromFriends.length === 0 ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" />
            <Text variant="bodySmall" style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {newFromFriends.map(renderFriendActivityCard)}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Popular With Friends */}
      <View style={styles.section}>
        {renderSectionHeader('Popular With Friends', () => navigation.navigate('PopularWithFriends'))}
        {loadingStates.popularWithFriends && popularWithFriends.length === 0 ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" />
            <Text variant="bodySmall" style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {popularWithFriends.map(renderPopularWithFriendsCard)}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Discover Friends */}
      <View style={styles.section}>
        {renderSectionHeader('Discover Friends')}
        {loadingStates.discoverFriends && discoverFriends.length === 0 ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" />
            <Text variant="bodySmall" style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {discoverFriends.map(renderPotentialFriendCard)}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Banner Ad */}
      <View style={styles.adContainer}>
        <BannerAdComponent />
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
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
  loadingSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  sectionDescription: {
    color: theme.colors.onSurfaceVariant,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  seeAllButton: {
    padding: spacing.sm,
  },
  seeAllText: {
    fontSize: 20,
    color: theme.colors.onSurfaceVariant,
    fontWeight: 'bold',
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
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  friendBadgeText: {
    marginLeft: 4,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
  },
  friendsCounter: {
    marginTop: spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  friendsCountText: {
    fontSize: 10,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  userCard: {
    width: USER_CARD_WIDTH,
    marginRight: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  username: {
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  mutualFollowers: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontSize: 12,
  },
  adContainer: {
    marginVertical: spacing.lg,
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
});