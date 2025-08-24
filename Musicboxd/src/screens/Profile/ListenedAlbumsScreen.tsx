import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
// SafeAreaView import removed - using regular View since header handles safe area
import {
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';

import { theme, spacing, shadows } from '../../utils/theme';
import { Listen, Album, HomeStackParamList, SearchStackParamList, ProfileStackParamList } from '../../types';
import { AlbumService } from '../../services/albumService';
import { RootState } from '../../store';
import { fetchUserListeningHistory } from '../../store/slices/userAlbumsSlice';
import { AlbumWithInteraction } from '../../services/userAlbumsService';

type ListenedAlbumsScreenRouteProp = RouteProp<
  HomeStackParamList | SearchStackParamList | ProfileStackParamList,
  'ListenedAlbums'
>;
type ListenedAlbumsScreenNavigationProp = StackNavigationProp<ProfileStackParamList>;


const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (width - spacing.lg * 3) / 2;

interface ListenedAlbumData {
  listen: Listen;
  album: Album;
}

export default function ListenedAlbumsScreen() {
  const route = useRoute<ListenedAlbumsScreenRouteProp>();
  const navigation = useNavigation<ListenedAlbumsScreenNavigationProp>();
  const dispatch = useDispatch();
  const { userId, username } = route.params;
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const { listeningHistory, loading: userAlbumsLoading } = useSelector((state: RootState) => state.userAlbums);

  const [listenedAlbums, setListenedAlbums] = useState<ListenedAlbumData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListenedAlbums = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch listening history from database if this is the current user
      if (currentUser && userId === currentUser.id) {
        await dispatch(fetchUserListeningHistory({ userId, limit: 50, offset: 0 }));
      } else {
        // For other users, fallback to the old method for now
        const listens = await AlbumService.getUserListens(userId);
        
        // Get album details for each listen
        const albumPromises = listens.map(async (listen) => {
          const albumResponse = await AlbumService.getAlbumById(listen.albumId);
          return {
            listen,
            album: albumResponse.data!,
          };
        });

        const albumsData = await Promise.all(albumPromises);
        // Filter out any failed album fetches and sort by listen date (newest first)
        const validAlbums = albumsData
          .filter(data => data.album)
          .sort((a, b) => new Date(b.listen.dateListened).getTime() - new Date(a.listen.dateListened).getTime());
        
        setListenedAlbums(validAlbums);
      }
    } catch (error) {
      console.error('Error loading listened albums:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser, dispatch]);

  useEffect(() => {
    loadListenedAlbums();
  }, [loadListenedAlbums]);

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const formatListenDate = (date: Date | string) => {
    const listenDate = new Date(date);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - listenDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return listenDate.toLocaleDateString();
  };

  // Get display data (either from database or legacy)
  const getDisplayData = (): (ListenedAlbumData | AlbumWithInteraction)[] => {
    if (currentUser && userId === currentUser.id) {
      // Use database-backed data for current user
      return listeningHistory;
    } else {
      // Use legacy data for other users
      return listenedAlbums;
    }
  };

  const isAlbumWithInteraction = (item: ListenedAlbumData | AlbumWithInteraction): item is AlbumWithInteraction => {
    return 'interaction' in item;
  };

  const renderAlbumCard = (data: ListenedAlbumData | AlbumWithInteraction, index: number) => {
    if (isAlbumWithInteraction(data)) {
      // Database-backed data
      return (
        <TouchableOpacity
          key={`${data.id}-${index}`}
          style={styles.albumCard}
          onPress={() => navigateToAlbum(data.id)}
        >
          <Image source={{ uri: data.image_url || 'https://via.placeholder.com/300x300/cccccc/666666?text=No+Image' }} style={styles.albumCover} />
          <View style={styles.albumInfo}>
            <Text variant="bodyMedium" numberOfLines={2} style={styles.albumTitle}>
              {data.name}
            </Text>
            <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
              {data.artist_name}
            </Text>
            <Text variant="bodySmall" style={styles.listenDate}>
              {data.interaction?.listened_at ? formatListenDate(data.interaction.listened_at) : 'Unknown'}
            </Text>
            {data.interaction?.rating && (
              <Text variant="bodySmall" style={styles.rating}>
                ★ {data.interaction.rating}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      );
    } else {
      // Legacy data
      return (
        <TouchableOpacity
          key={data.listen.id}
          style={styles.albumCard}
          onPress={() => navigateToAlbum(data.album.id)}
        >
          <Image source={{ uri: data.album.coverImageUrl }} style={styles.albumCover} />
          <View style={styles.albumInfo}>
            <Text variant="bodyMedium" numberOfLines={2} style={styles.albumTitle}>
              {data.album.title}
            </Text>
            <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
              {data.album.artist}
            </Text>
            <Text variant="bodySmall" style={styles.listenDate}>
              {formatListenDate(new Date(data.listen.dateListened))}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  const displayData = getDisplayData();
  const isLoading = loading || (currentUser && userId === currentUser.id && userAlbumsLoading.listeningHistory);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading listened albums...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              Albums Listened
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              @{username} • {displayData.length} album{displayData.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {displayData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="titleLarge" style={styles.emptyTitle}>
              No Albums Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {userId === currentUser?.id ? 'Start listening to albums and they\'ll appear here!' : `${username} hasn't listened to any albums yet.`}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.albumGrid}>
              {displayData.map((item, index) => renderAlbumCard(item, index))}
            </View>
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
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
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  albumCover: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: 'cover',
  },
  albumInfo: {
    padding: spacing.md,
  },
  albumTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  artistName: {
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  listenDate: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  rating: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});