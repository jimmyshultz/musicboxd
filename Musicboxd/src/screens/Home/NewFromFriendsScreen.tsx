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

type NewFromFriendsNavigationProp = StackNavigationProp<HomeStackParamList>;

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (width - spacing.lg * 4) / 3; // 3 columns with proper spacing

// Icon component to avoid creating it during render
const arrowIconStyle = { fontSize: 20, color: '#666' };
const ArrowLeftIcon = (props: any) => <Text style={{ ...arrowIconStyle, color: props.color || '#666' }}>←</Text>;

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
      // Mock data for now - replace with actual service call later
      const response = await AlbumService.getPopularAlbums();
      const currentUserId = currentUser?.id || 'current-user-id';
      const users = await userService.getSuggestedUsers(currentUserId, 10);
      
      if (response.success && response.data.length > 0) {
        // Filter out current user from friends list
        const currentUsername = currentUser?.username || 'musiclover2024';
        const friendsOnly = users.filter(user => user.username !== currentUsername);
        
        // Early return if no friends or albums available
        if (friendsOnly.length === 0 || response.data.length === 0) {
          setActivities([]);
          return;
        }
        
        // Create mock friend activity data
        const friendActivities: FriendActivity[] = [];
        
        for (let i = 0; i < 60; i++) {
          const album = response.data[i % response.data.length];
          const friend = friendsOnly[i % friendsOnly.length];
          
          friendActivities.push({
            album: {
              ...album,
              id: album.id + '_friend_' + i,
              title: i % 3 === 0 ? album.title + ' (Recently Discovered)' : album.title,
            },
            friend: {
              id: friend.id,
              username: friend.username,
              profilePicture: friend.profilePicture,
            },
            dateListened: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
          });
        }
        
        // Sort by most recent first
        friendActivities.sort((a, b) => b.dateListened.getTime() - a.dateListened.getTime());
        setActivities(friendActivities);
      } else {
        setActivities([]);
      }
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
            New From Friends
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {activities.map((activity, index) => renderActivityCard(activity, index))}
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