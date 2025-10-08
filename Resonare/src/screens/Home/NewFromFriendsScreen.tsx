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
import { Text, ActivityIndicator, Avatar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import { HomeStackParamList, Album } from '../../types';
import { RootState } from '../../store';
import { userService } from '../../services/userService';
import { diaryService } from '../../services/diaryService';
import { spacing } from '../../utils/theme';

type NewFromFriendsNavigationProp = StackNavigationProp<HomeStackParamList>;

const { width } = Dimensions.get('window');
const CARDS_PER_ROW = 3;
const HORIZONTAL_SPACING = spacing.lg;
const CARD_MARGIN = spacing.sm;
const ALBUM_CARD_WIDTH = (width - (HORIZONTAL_SPACING * 2) - (CARD_MARGIN * (CARDS_PER_ROW - 1))) / CARDS_PER_ROW;


interface FriendActivity {
  album: Album;
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

export default function NewFromFriendsScreen() {
  const navigation = useNavigation<NewFromFriendsNavigationProp>();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const styles = createStyles(theme);
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFriendActivities = useCallback(async () => {
    setLoading(true);
    try {
      const currentUserId = currentUser?.id;
      if (!currentUserId) {
        setActivities([]);
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
        setActivities([]);
        return;
      }
      
      const friendActivities: FriendActivity[] = [];
      
      // Get real diary entries for each friend
      for (const friend of friendsOnly) {
        try {
          const userDiaryEntries = await diaryService.getUserDiaryEntriesWithAlbums(friend.id);
          
          // Get all diary entries for this friend and create activities
          for (const entry of userDiaryEntries) {
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

              friendActivities.push({
                album: album, // Use converted album
                diaryEntryId: entry.id, // Store diary entry ID for navigation
                friend: {
                  id: friend.id,
                  username: friend.username,
                  profilePicture: friend.avatar_url,
                },
                diaryDate: new Date(entry.diary_date),
                rating: entry.rating,
                notes: entry.notes,
              });
            }
          }
        } catch (error) {
          console.error(`Error loading diary entries for friend ${friend.username}:`, error);
        }
      }
      
      // Sort by most recent first and limit to 60 items for performance
      friendActivities.sort((a, b) => b.diaryDate.getTime() - a.diaryDate.getTime());
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



  const navigateToUserProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const navigateToDiaryEntry = (entryId: string, userId: string) => {
    navigation.navigate('DiaryEntryDetails', { entryId, userId });
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

  const renderActivityCard = (activity: FriendActivity, index: number) => {
    const isLastInRow = (index + 1) % CARDS_PER_ROW === 0;
    
    return (
      <View key={`${activity.album.id}_${index}`} style={[styles.albumCard, isLastInRow && styles.albumCardLastInRow]}>
      <TouchableOpacity onPress={() => navigateToDiaryEntry(activity.diaryEntryId, activity.friend.id)}>
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
            {formatTimeAgo(activity.diaryDate)}
          </Text>
        </View>
      </TouchableOpacity>
      </View>
    );
  };

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

const createStyles = (theme: any) => StyleSheet.create({
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
    paddingHorizontal: HORIZONTAL_SPACING,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'flex-start',
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
    marginBottom: spacing.lg,
    marginRight: CARD_MARGIN,
  },
  albumCardLastInRow: {
    marginRight: 0,
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
    color: theme.colors.onSurfaceVariant,
  },
  timeAgo: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    opacity: 0.7,
  },
});