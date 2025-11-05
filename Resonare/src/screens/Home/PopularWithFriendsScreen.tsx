import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
// SafeAreaView import removed - using regular View since header handles safe area
import { Text, ActivityIndicator, Avatar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import { HomeStackParamList, Album } from '../../types';
import { RootState } from '../../store';
import { AlbumService } from '../../services/albumService';
import { userService } from '../../services/userService';
import { spacing } from '../../utils/theme';

type PopularWithFriendsNavigationProp = StackNavigationProp<HomeStackParamList>;

const CARDS_PER_ROW = 3;



interface FriendPopularAlbum {
  album: Album;
  friendsWhoListened: {
    id: string;
    username: string;
    profilePicture?: string;
  }[];
  totalFriends: number;
}

export default function PopularWithFriendsScreen() {
  const navigation = useNavigation<PopularWithFriendsNavigationProp>();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const { width } = useWindowDimensions();
  
  // Responsive spacing calculation: use percentage-based approach for consistent layout
  const HORIZONTAL_SPACING = Math.max(spacing.md, width * 0.04); // 4% of screen width, minimum 16
  const CARD_MARGIN = Math.max(spacing.xs, width * 0.015); // 1.5% of screen width, minimum 4
  
  const albumCardWidth = (width - (HORIZONTAL_SPACING * 2) - (CARD_MARGIN * (CARDS_PER_ROW - 1))) / CARDS_PER_ROW;
  const styles = createStyles(theme, albumCardWidth, HORIZONTAL_SPACING, CARD_MARGIN);
  const [albums, setAlbums] = useState<FriendPopularAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPopularWithFriends = useCallback(async () => {
    setLoading(true);
    try {
      const currentUserId = currentUser?.id;
      if (!currentUserId) {
        setAlbums([]);
        setLoading(false);
        return;
      }
      
      // Get users that current user is actually following
      const users = await userService.getUserFollowing(currentUserId);
      
      // Filter out current user from friends list
      const currentUsername = currentUser?.username || 'musiclover2024';
      const friendsOnly = users.filter(user => user.username !== currentUsername);
      
      // Early return if no friends available
      if (friendsOnly.length === 0) {
        setAlbums([]);
        return;
      }
      
      // Track album popularity: albumId -> { album, friendsWhoListened: Set<friendId> }
      const albumPopularity = new Map<string, {
        album: Album;
        friendsWhoListened: Set<string>;
        friendData: { id: string; username: string; profilePicture?: string; }[];
      }>();
      
      // Collect listen data from all friends
      for (const friend of friendsOnly) {
        try {
          const userListens = await AlbumService.getUserListens(friend.id);
          
          for (const listen of userListens) {
            // Get or create album entry
            if (!albumPopularity.has(listen.albumId)) {
              const albumResponse = await AlbumService.getAlbumById(listen.albumId);
              if (albumResponse.success && albumResponse.data) {
                albumPopularity.set(listen.albumId, {
                  album: albumResponse.data,
                  friendsWhoListened: new Set(),
                  friendData: [],
                });
              } else {
                continue; // Skip if album not found
              }
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
          }
        } catch (error) {
          console.error(`Error loading listens for friend ${friend.username}:`, error);
        }
      }
      
      // Convert to FriendPopularAlbum array and filter albums with multiple listeners
      const popularWithFriends: FriendPopularAlbum[] = [];
      
      albumPopularity.forEach((entry, _albumId) => {
        // Only include albums that have been listened to by 1+ friends (lowered from 2+ for demo data)
        if (entry.friendsWhoListened.size >= 1) {
          popularWithFriends.push({
            album: entry.album,
            friendsWhoListened: entry.friendData.slice(0, 3), // Show max 3 for UI
            totalFriends: entry.friendsWhoListened.size,
          });
        }
      });
      
      // Sort by number of friends who listened (descending) and limit to 60
      popularWithFriends.sort((a, b) => b.totalFriends - a.totalFriends);
      setAlbums(popularWithFriends.slice(0, 60));
    } catch (error) {
      console.error('Error loading popular with friends:', error);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPopularWithFriends();
  }, [loadPopularWithFriends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPopularWithFriends();
    } finally {
      setRefreshing(false);
    }
  }, [loadPopularWithFriends]);

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const renderFriendAvatars = (friends: FriendPopularAlbum['friendsWhoListened'], totalFriends: number) => {
    const displayedFriends = friends.slice(0, 3);
    const remainingCount = totalFriends - displayedFriends.length;
    
    return (
      <View style={styles.friendAvatars}>
        {displayedFriends.map((friend, index) => (
          <Avatar.Image 
            key={friend.id}
            size={24} 
            source={{ uri: friend.profilePicture || 'https://via.placeholder.com/48x48/cccccc/999999?text=U' }}
            style={[styles.friendAvatar, index > 0 && styles.overlappingAvatar]}
          />
        ))}
        {remainingCount > 0 && (
          <View style={[
            styles.friendAvatar, 
            styles.remainingCount, 
            displayedFriends.length > 0 && styles.overlappingAvatar
          ]}>
            <Text style={styles.remainingText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderAlbumCard = (popularAlbum: FriendPopularAlbum, index: number) => {
    const isLastInRow = (index + 1) % CARDS_PER_ROW === 0;
    
    return (
      <TouchableOpacity
        key={popularAlbum.album.id}
        style={[styles.albumCard, isLastInRow && styles.albumCardLastInRow]}
        onPress={() => navigateToAlbum(popularAlbum.album.id)}
      >
      <Image source={{ uri: popularAlbum.album.coverImageUrl }} style={styles.albumCover} />
      <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
        {popularAlbum.album.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
        {popularAlbum.album.artist}
      </Text>
      
      <View style={styles.friendsInfo}>
        {renderFriendAvatars(popularAlbum.friendsWhoListened, popularAlbum.totalFriends)}
        <Text variant="bodySmall" style={styles.friendsCount}>
          {popularAlbum.totalFriends} friend{popularAlbum.totalFriends !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <View style={styles.rankBadge}>
        <Text variant="bodySmall" style={styles.rankText}>
          #{index + 1}
        </Text>
      </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading popular albums...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.grid}>
            {albums.map((album, index) => renderAlbumCard(album, index))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (theme: any, albumCardWidth: number, horizontalSpacing: number, cardMargin: number) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
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
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },

  headerTitle: {
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 48, // Same width as back button for centering
  },
  scrollContainer: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: horizontalSpacing,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'flex-start',
  },
  albumCard: {
    width: albumCardWidth,
    marginBottom: spacing.lg,
    marginRight: cardMargin,
    position: 'relative',
  },
  albumCardLastInRow: {
    marginRight: 0,
  },
  albumCover: {
    width: albumCardWidth,
    height: albumCardWidth,
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
    marginBottom: spacing.sm,
  },
  friendsInfo: {
    marginTop: spacing.xs,
  },
  friendAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  friendAvatar: {
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  overlappingAvatar: {
    marginLeft: -8, // Adjust for overlapping avatars
  },
  remainingCount: {
    backgroundColor: theme.colors.onSurfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  remainingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  friendsCount: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  rankBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rankText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});