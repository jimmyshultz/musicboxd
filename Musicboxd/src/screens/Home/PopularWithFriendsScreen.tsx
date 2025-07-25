import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, IconButton, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import { HomeStackParamList, Album } from '../../types';
import { RootState } from '../../store';
import { AlbumService } from '../../services/albumService';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../utils/theme';

type PopularWithFriendsNavigationProp = StackNavigationProp<HomeStackParamList>;

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (width - spacing.lg * 4) / 3; // 3 columns with proper spacing

// Icon component to avoid creating it during render
const arrowIconStyle = { fontSize: 20, color: '#666' };
const ArrowLeftIcon = (props: any) => <Text style={{ ...arrowIconStyle, color: props.color || '#666' }}>←</Text>;

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
  const [albums, setAlbums] = useState<FriendPopularAlbum[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPopularWithFriends = useCallback(async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual service call later
      const response = await AlbumService.getPopularAlbums();
      const currentUserId = currentUser?.id || 'current-user-id';
      const users = await userService.getSuggestedUsers(currentUserId, 15);
      
      if (response.success && response.data.length > 0) {
        // Filter out current user from friends list
        const currentUsername = currentUser?.username || 'musiclover2024';
        const friendsOnly = users.filter(user => user.username !== currentUsername);
        
        // Early return if no friends or albums available
        if (friendsOnly.length === 0 || response.data.length === 0) {
          setAlbums([]);
          return;
        }
        
        // Create mock popular with friends data
        const popularWithFriends: FriendPopularAlbum[] = [];
        
        for (let i = 0; i < 60; i++) {
          const album = response.data[i % response.data.length];
          const friendCount = Math.floor(Math.random() * 10) + 1; // 1-10 friends
          const maxFriendsToShow = Math.min(friendCount, 3, friendsOnly.length);
          const friendsWhoListened = friendsOnly.slice(0, maxFriendsToShow); // Show max 3 avatars
          
          popularWithFriends.push({
            album: {
              ...album,
              id: album.id + '_popular_' + i,
              title: i % 4 === 0 ? album.title + ' (Friends\' Choice)' : album.title,
            },
            friendsWhoListened,
            totalFriends: friendCount,
          });
        }
        
        // Sort by number of friends who listened (descending)
        popularWithFriends.sort((a, b) => b.totalFriends - a.totalFriends);
        setAlbums(popularWithFriends);
      } else {
        setAlbums([]);
      }
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

  const renderAlbumCard = (popularAlbum: FriendPopularAlbum, index: number) => (
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon={ArrowLeftIcon}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Popular With Friends
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {albums.map((album, index) => renderAlbumCard(album, index))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  backButton: {
    margin: 0,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
    marginBottom: spacing.lg,
    position: 'relative',
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
    borderColor: colors.background,
  },
  overlappingAvatar: {
    marginLeft: -8, // Adjust for overlapping avatars
  },
  remainingCount: {
    backgroundColor: colors.textSecondary,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rankBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
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