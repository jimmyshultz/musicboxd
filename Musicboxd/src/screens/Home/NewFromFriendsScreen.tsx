import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
// SafeAreaView import removed - using regular View since header handles safe area
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import { HomeStackParamList, Album } from '../../types';
import { RootState } from '../../store';
import { AlbumService } from '../../services/albumService';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../utils/theme';

type NewFromFriendsNavigationProp = StackNavigationProp<HomeStackParamList>;

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (width - spacing.lg * 4) / 3; // 3 columns with proper spacing


interface FriendActivity {
  album: Album;
  friend: {
    id: string;
    username: string;
    profilePicture?: string;
  };
  dateListened: Date;
}

export default function NewFromFriendsScreen() {
  const navigation = useNavigation<NewFromFriendsNavigationProp>();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFriendActivities = useCallback(async () => {
    setLoading(true);
    try {
      const currentUserId = currentUser?.id || 'current-user-id';
      const users = await userService.getSuggestedUsers(currentUserId, 10);
      
      // Filter out current user from friends list
      const currentUsername = currentUser?.username || 'musiclover2024';
      const friendsOnly = users.filter(user => user.username !== currentUsername);
      
      // Early return if no friends available
      if (friendsOnly.length === 0) {
        setActivities([]);
        return;
      }
      
      const friendActivities: FriendActivity[] = [];
      
      // Get real listen data for each friend
      for (const friend of friendsOnly) {
        try {
          const userListens = await AlbumService.getUserListens(friend.id);
          
          // Get all listens for this friend and create activities
          for (const listen of userListens) {
            const albumResponse = await AlbumService.getAlbumById(listen.albumId);
            
            if (albumResponse.success && albumResponse.data) {
              friendActivities.push({
                album: albumResponse.data, // Use original album without modifications
                friend: {
                  id: friend.id,
                  username: friend.username,
                  profilePicture: friend.profilePicture,
                },
                dateListened: new Date(listen.dateListened),
              });
            }
          }
        } catch (error) {
          console.error(`Error loading listens for friend ${friend.username}:`, error);
        }
      }
      
      // Sort by most recent first and limit to 60 items for performance
      friendActivities.sort((a, b) => b.dateListened.getTime() - a.dateListened.getTime());
      setActivities(friendActivities.slice(0, 60));
    } catch (error) {
      console.error('Error loading friend activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadFriendActivities();
  }, [loadFriendActivities]);

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const navigateToUserProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return '1w ago';
  };

  const renderActivityCard = (activity: FriendActivity, index: number) => (
    <View key={`${activity.album.id}_${index}`} style={styles.albumCard}>
      <TouchableOpacity onPress={() => navigateToAlbum(activity.album.id)}>
        <Image source={{ uri: activity.album.coverImageUrl }} style={styles.albumCover} />
        <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
          {activity.album.title}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
          {activity.album.artist}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.friendInfo}
        onPress={() => navigateToUserProfile(activity.friend.id)}
      >
        <Avatar.Image 
          size={20} 
          source={{ uri: activity.friend.profilePicture || 'https://via.placeholder.com/40x40/cccccc/999999?text=U' }}
        />
        <View style={styles.friendDetails}>
          <Text variant="bodySmall" numberOfLines={1} style={styles.friendName}>
            @{activity.friend.username}
          </Text>
          <Text variant="bodySmall" style={styles.timeAgo}>
            {formatTimeAgo(activity.dateListened)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading friend activity...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {activities.map((activity, index) => renderActivityCard(activity, index))}
          </View>
        </ScrollView>
      </View>
    </View>
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
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  friendDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  friendName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  timeAgo: {
    fontSize: 10,
    color: colors.textSecondary,
    opacity: 0.7,
  },
});