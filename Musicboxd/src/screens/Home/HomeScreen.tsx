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
  mutualFriends: number;
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
  
  const { loading } = useSelector((state: RootState) => state.albums);
  
  const [popularThisWeek, setPopularThisWeek] = useState<Album[]>([]);
  const [newFromFriends, setNewFromFriends] = useState<FriendActivity[]>([]);
  const [popularWithFriends, setPopularWithFriends] = useState<FriendPopularAlbum[]>([]);
  const [discoverFriends, setDiscoverFriends] = useState<PotentialFriend[]>([]);

  const loadPopularThisWeek = useCallback(async () => {
    try {
      const response = await AlbumService.getPopularAlbums();
      if (response.success) {
        // Create mock weekly popular data
        const weeklyPopular = [
          ...response.data,
          ...response.data.map(album => ({
            ...album,
            id: album.id + '_weekly',
            title: album.title + ' (Hot This Week)',
          })),
        ].slice(0, 20);
        setPopularThisWeek(weeklyPopular);
      }
    } catch (error) {
      console.error('Error loading popular this week:', error);
    }
  }, []);

  const loadNewFromFriends = useCallback(async () => {
    try {
      const response = await AlbumService.getPopularAlbums();
      const users = await userService.getSuggestedUsers('current-user', 8);
      
      if (response.success) {
        const friendActivities: FriendActivity[] = [];
        
        for (let i = 0; i < 20; i++) {
          const album = response.data[i % response.data.length];
          const friend = users[i % users.length];
          
          friendActivities.push({
            album: {
              ...album,
              id: album.id + '_friend_activity_' + i,
              title: i % 3 === 0 ? album.title + ' (New Discovery)' : album.title,
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
      }
    } catch (error) {
      console.error('Error loading new from friends:', error);
    }
  }, []);

  const loadPopularWithFriends = useCallback(async () => {
    try {
      const response = await AlbumService.getPopularAlbums();
      const users = await userService.getSuggestedUsers('current-user', 10);
      
      if (response.success) {
        const friendPopularAlbums: FriendPopularAlbum[] = [];
        
        for (let i = 0; i < 20; i++) {
          const album = response.data[i % response.data.length];
          const friendCount = Math.floor(Math.random() * 8) + 2; // 2-9 friends
          const friendsWhoListened = users.slice(0, Math.min(friendCount, 3));
          
          friendPopularAlbums.push({
            album: {
              ...album,
              id: album.id + '_friend_popular_' + i,
              title: i % 4 === 0 ? album.title + ' (Friends Love This)' : album.title,
            },
            friendsWhoListened,
            totalFriends: friendCount,
          });
        }
        
        friendPopularAlbums.sort((a, b) => b.totalFriends - a.totalFriends);
        setPopularWithFriends(friendPopularAlbums);
      }
    } catch (error) {
      console.error('Error loading popular with friends:', error);
    }
  }, []);

  const loadDiscoverFriends = useCallback(async () => {
    try {
      const users = await userService.getSuggestedUsers('current-user', 20);
      
      const potentialFriends: PotentialFriend[] = users.map((user, _index) => ({
        user,
        mutualFriends: Math.floor(Math.random() * 12) + 1, // 1-12 mutual friends
      })).slice(0, 20);
      
      // Sort by mutual friends count (descending)
      potentialFriends.sort((a, b) => b.mutualFriends - a.mutualFriends);
      setDiscoverFriends(potentialFriends);
    } catch (error) {
      console.error('Error loading discover friends:', error);
    }
  }, []);

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
      <Text variant="bodySmall" style={styles.mutualFriends}>
        {potentialFriend.mutualFriends} mutual friends
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
  mutualFriends: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
  },
});