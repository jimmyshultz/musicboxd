import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
// SafeAreaView import removed - using regular View since header handles safe area
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import { spacing, shadows } from '../../utils/theme';
import {
  Listen,
  Album,
  HomeStackParamList,
  SearchStackParamList,
  ProfileStackParamList,
} from '../../types';
import { RootState } from '../../store';
import { userStatsServiceV2 } from '../../services/userStatsServiceV2';

type ListenedAlbumsScreenRouteProp = RouteProp<
  HomeStackParamList | SearchStackParamList | ProfileStackParamList,
  'ListenedAlbums'
>;
type ListenedAlbumsScreenNavigationProp =
  StackNavigationProp<ProfileStackParamList>;

const CARDS_PER_ROW = 2;

interface ListenedAlbumData {
  listen: Listen;
  album: Album;
}

export default function ListenedAlbumsScreen() {
  const route = useRoute<ListenedAlbumsScreenRouteProp>();
  const navigation = useNavigation<ListenedAlbumsScreenNavigationProp>();
  const { userId, username } = route.params;
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // Responsive spacing calculation: use percentage-based approach for consistent layout
  const HORIZONTAL_SPACING = Math.max(spacing.md, width * 0.04); // 4% of screen width, minimum 16
  const CARD_MARGIN = Math.max(spacing.xs, width * 0.02); // 2% of screen width, minimum 4

  const albumCardWidth =
    (width - HORIZONTAL_SPACING * 2 - CARD_MARGIN * (CARDS_PER_ROW - 1)) /
    CARDS_PER_ROW;
  const styles = createStyles(
    theme,
    albumCardWidth,
    HORIZONTAL_SPACING,
    CARD_MARGIN,
  );

  const [listenedAlbums, setListenedAlbums] = useState<ListenedAlbumData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadListenedAlbums = useCallback(async () => {
    setLoading(true);
    try {
      // Use the new service to get listening history for any user
      const listeningHistory = await userStatsServiceV2.getUserListeningHistory(
        userId,
        50,
        0,
      );

      // Convert to the format expected by this screen
      const listenedAlbumsData: ListenedAlbumData[] = listeningHistory.map(
        item => ({
          album: {
            id: item.id,
            title: item.name,
            artist: item.artist_name,
            releaseDate: item.release_date || '',
            genre: item.genres || [],
            coverImageUrl: item.image_url || '',
            spotifyUrl: item.spotify_url || '',
            totalTracks: item.total_tracks || 0,
            albumType: item.album_type || 'album',
            trackList: [], // Empty for now
          },
          listen: {
            id: item.interaction?.id || `listen_${item.id}`,
            userId: item.interaction?.user_id || userId,
            albumId: item.id,
            dateListened: new Date(item.interaction?.listened_at || Date.now()),
          },
        }),
      );

      setListenedAlbums(listenedAlbumsData);
    } catch (error) {
      console.error('Error loading listened albums:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadListenedAlbums();
  }, [loadListenedAlbums]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadListenedAlbums();
    } finally {
      setRefreshing(false);
    }
  }, [loadListenedAlbums]);

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const formatListenDate = (date: Date | string) => {
    const listenDate = new Date(date);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - listenDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return listenDate.toLocaleDateString();
  };

  // Get display data - now we always use the same data structure from our service
  const getDisplayData = (): ListenedAlbumData[] => {
    return listenedAlbums;
  };

  const renderAlbumCard = (data: ListenedAlbumData, index: number) => {
    const isLastInRow = (index + 1) % CARDS_PER_ROW === 0;

    return (
      <TouchableOpacity
        key={`${data.album.id}-${index}`}
        style={[styles.albumCard, isLastInRow && styles.albumCardLastInRow]}
        onPress={() => navigateToAlbum(data.album.id)}
      >
        <FastImage
          source={{
            uri:
              data.album.coverImageUrl ||
              'https://via.placeholder.com/300x300/cccccc/666666?text=No+Image',
            priority: FastImage.priority.normal,
          }}
          style={styles.albumCover}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.albumInfo}>
          <Text
            variant="bodyMedium"
            numberOfLines={2}
            style={styles.albumTitle}
          >
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
  };

  const displayData = getDisplayData();
  const isLoading = loading;

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
              @{username} • {displayData.length} album
              {displayData.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {displayData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="titleLarge" style={styles.emptyTitle}>
              No Albums Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {userId === currentUser?.id
                ? "Start listening to albums and they'll appear here!"
                : `${username} hasn't listened to any albums yet.`}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
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

const createStyles = (
  theme: any,
  albumCardWidth: number,
  horizontalSpacing: number,
  cardMargin: number,
) =>
  StyleSheet.create({
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
      color: theme.colors.onSurfaceVariant,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },

    headerContent: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    headerTitle: {
      fontWeight: 'bold',
    },
    headerSubtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: spacing.xs,
    },
    scrollView: {
      flex: 1,
    },
    albumGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: horizontalSpacing,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      justifyContent: 'flex-start',
    },
    albumCard: {
      width: albumCardWidth,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginBottom: spacing.lg,
      marginRight: cardMargin,
      ...shadows.small,
    },
    albumCardLastInRow: {
      marginRight: 0,
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
      color: theme.colors.onSurfaceVariant,
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
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
    },
    bottomPadding: {
      height: spacing.xl,
    },
  });
