import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { HomeStackParamList, User, Album } from '../../types';
import { RootState } from '../../store';
import { fetchAlbumsStart, fetchAlbumsSuccess } from '../../store/slices/albumSlice';
import { AlbumService } from '../../services/albumService';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../utils/theme';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList>;

const ALBUM_CARD_WIDTH = 120;
const USER_CARD_WIDTH = 140;

interface FriendActivity {
  album: Album;
  friend: {
    id: string;
    username: string;
    profilePicture?: string;
  };
  dateListened: Date;
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
  user: User;
  mutualFollowers: number;
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
  
  const { loading } = useSelector((state: RootState) => state.albums);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  
  const [popularThisWeek, setPopularThisWeek] = useState<Album[]>([]);
  const [newFromFriends, setNewFromFriends] = useState<FriendActivity[]>([]);
  const [popularWithFriends, setPopularWithFriends] = useState<FriendPopularAlbum[]>([]);
  const [discoverFriends, setDiscoverFriends] = useState<PotentialFriend[]>([]);

  const loadPopularThisWeek = useCallback(async () => {
    try {
      // Get popular albums for this week
      const response = await AlbumService.getPopularAlbums();
      if (response.success) {
        // Get unique albums without modification
        const uniqueAlbums = response.data.slice(0, 20);
        setPopularThisWeek(uniqueAlbums);
      }
    } catch (error) {
      console.error('Error loading popular this week:', error);
    }
  }, []);

  const loadNewFromFriends = useCallback(async () => {
    try {
      const response = await AlbumService.getPopularAlbums();
      const currentUserId = currentUser?.id || 'current-user-id';
      const users = await userService.getSuggestedUsers(currentUserId, 10);
      
      if (response.success && response.data.length > 0) {
        // Filter out current user from friends list
        const currentUsername = currentUser?.username || 'musiclover2024';
        const friendsOnly = users.filter(user => user.username !== currentUsername);
        
        // Early return if no friends or albums available
        if (friendsOnly.length === 0 || response.data.length === 0) {
          setNewFromFriends([]);
          return;
        }
        
        const friendActivities: FriendActivity[] = [];
        
        // Allow duplicates in New from Friends (multiple friends can listen to same album)
        for (let i = 0; i < 20; i++) {
          const album = response.data[i % response.data.length];
          const friend = friendsOnly[i % friendsOnly.length];
          
          friendActivities.push({
            album: {
              ...album,
              // Use unique ID for each activity instance to allow duplicates
              id: album.id + '_friend_activity_' + i,
            },
            friend: {
              id: friend.id,
              username: friend.username,
              profilePicture: friend.profilePicture,
            },
            dateListened: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random date within last day
          });
        }
        
        friendActivities.sort((a, b) => b.dateListened.getTime() - a.dateListened.getTime());
        setNewFromFriends(friendActivities);
      } else {
        setNewFromFriends([]);
      }
    } catch (error) {
      console.error('Error loading new from friends:', error);
      setNewFromFriends([]);
    }
  }, [currentUser]);

  const loadPopularWithFriends = useCallback(async () => {
    try {
      const response = await AlbumService.getPopularAlbums();
      const currentUserId = currentUser?.id || 'current-user-id';
      const users = await userService.getSuggestedUsers(currentUserId, 10);
      
      if (response.success && response.data.length > 0) {
        // Filter out current user from friends list
        const currentUsername = currentUser?.username || 'musiclover2024';
        const friendsOnly = users.filter(user => user.username !== currentUsername);
        
        // Early return if no friends or albums available
        if (friendsOnly.length === 0 || response.data.length === 0) {
          setPopularWithFriends([]);
          return;
        }
        
        const friendPopularAlbums: FriendPopularAlbum[] = [];
        const usedAlbumIds = new Set<string>(); // Track used albums to avoid duplicates
        
        // No duplicates in Popular with Friends
        for (let i = 0; i < response.data.length && friendPopularAlbums.length < 20; i++) {
          const album = response.data[i];
          
          // Skip if album already used
          if (usedAlbumIds.has(album.id)) {
            continue;
          }
          
          usedAlbumIds.add(album.id);
          const friendCount = Math.floor(Math.random() * 8) + 2; // 2-9 friends
          const maxFriendsToShow = Math.min(friendCount, 3, friendsOnly.length);
          const friendsWhoListened = friendsOnly.slice(0, maxFriendsToShow);
          
          friendPopularAlbums.push({
            album: album, // Use original album without modifications
            friendsWhoListened,
            totalFriends: friendCount,
          });
        }
        
        setPopularWithFriends(friendPopularAlbums);
      } else {
        setPopularWithFriends([]);
      }
    } catch (error) {
      console.error('Error loading popular with friends:', error);
      setPopularWithFriends([]);
    }
  }, [currentUser]);

  const loadDiscoverFriends = useCallback(async () => {
    try {
      const currentUserId = currentUser?.id || 'current-user-id';
      const users = await userService.getSuggestedUsers(currentUserId, 20);
      
      if (users.length > 0) {
        // Filter out current user from potential friends
        const currentUsername = currentUser?.username || 'musiclover2024';
        const potentialUsers = users.filter(user => user.username !== currentUsername);
        
        if (potentialUsers.length === 0) {
          setDiscoverFriends([]);
          return;
        }
        
        const potentialFriends: PotentialFriend[] = potentialUsers.map((user, _index) => ({
          user,
          mutualFollowers: Math.floor(Math.random() * 12) + 1, // 1-12 mutual followers
        })).slice(0, 20);
        
        // Sort by mutual followers count (descending)
        potentialFriends.sort((a, b) => b.mutualFollowers - a.mutualFollowers);
        setDiscoverFriends(potentialFriends);
      } else {
        setDiscoverFriends([]);
      }
    } catch (error) {
      console.error('Error loading discover friends:', error);
      setDiscoverFriends([]);
    }
  }, [currentUser]);

  useEffect(() => {
    dispatch(fetchAlbumsStart());
    Promise.all([
      loadPopularThisWeek(),
      loadNewFromFriends(),
      loadPopularWithFriends(),
      loadDiscoverFriends(),
    ]).finally(() => {
      dispatch(fetchAlbumsSuccess([]));
    });
  }, [dispatch, loadPopularThisWeek, loadNewFromFriends, loadPopularWithFriends, loadDiscoverFriends]);

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const navigateToUserProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const renderSectionHeader = (title: string, onSeeAll?: () => void) => (
    <View style={styles.sectionHeader}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>›</Text>
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
      <Image source={{ uri: album.coverImageUrl }} style={styles.albumCover} />
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
      key={popularAlbum.album.id}
      style={styles.albumCard}
      onPress={() => navigateToAlbum(popularAlbum.album.id)}
    >
      <Image source={{ uri: popularAlbum.album.coverImageUrl }} style={styles.albumCover} />
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
        source={{ uri: potentialFriend.user.profilePicture || 'https://via.placeholder.com/120x120/cccccc/999999?text=User' }}
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Popular This Week */}
      <View style={styles.section}>
        {renderSectionHeader('Popular This Week', () => navigation.navigate('PopularThisWeek'))}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.horizontalList}>
            {popularThisWeek.map(renderAlbumCard)}
          </View>
        </ScrollView>
      </View>

      {/* New From Friends */}
      <View style={styles.section}>
        {renderSectionHeader('New From Friends', () => navigation.navigate('NewFromFriends'))}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.horizontalList}>
            {newFromFriends.map(renderFriendActivityCard)}
          </View>
        </ScrollView>
      </View>

      {/* Popular With Friends */}
      <View style={styles.section}>
        {renderSectionHeader('Popular With Friends', () => navigation.navigate('PopularWithFriends'))}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.horizontalList}>
            {popularWithFriends.map(renderPopularWithFriendsCard)}
          </View>
        </ScrollView>
      </View>

      {/* Discover Friends */}
      <View style={styles.section}>
        {renderSectionHeader('Discover Friends')}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.horizontalList}>
            {discoverFriends.map(renderPotentialFriendCard)}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
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
  seeAllButton: {
    padding: spacing.sm,
  },
  seeAllText: {
    fontSize: 20,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    lineHeight: 14,
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
  },
  friendBadgeText: {
    marginLeft: 4,
    fontSize: 10,
    color: colors.textSecondary,
  },
  friendsCounter: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  friendsCountText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  userCard: {
    width: USER_CARD_WIDTH,
    marginRight: spacing.md,
    backgroundColor: colors.card,
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
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
  },
});