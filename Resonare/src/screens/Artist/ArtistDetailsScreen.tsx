import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import {
  Text,
  ActivityIndicator,
  Chip,
  useTheme,
} from 'react-native-paper';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { HomeStackParamList, SearchStackParamList, ProfileStackParamList, Album } from '../../types';
import { RootState } from '../../store';
import {
  setCurrentArtist,
  setCurrentArtistAlbums,
  setLoading,
  setAlbumsLoading,
  setError,
} from '../../store/slices/artistSlice';
import { ArtistService } from '../../services/artistService';
import { spacing, shadows } from '../../utils/theme';
import BannerAdComponent from '../../components/BannerAd';

type ArtistDetailsRouteProp = RouteProp<
  HomeStackParamList | SearchStackParamList | ProfileStackParamList,
  'ArtistDetails'
>;

type ArtistDetailsNavigationProp = StackNavigationProp<
  HomeStackParamList | SearchStackParamList | ProfileStackParamList,
  'ArtistDetails'
>;

const { width } = Dimensions.get('window');
const ARTIST_IMAGE_SIZE = width * 0.5;
const ALBUM_CARD_WIDTH = (width - spacing.lg * 3) / 2; // 2 columns with spacing

// Helper to format follower count
const formatFollowers = (count?: number): string => {
  if (!count) return '0';
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// Helper to get album year from release date
const getAlbumYear = (releaseDate: string): string => {
  if (!releaseDate) return '';
  const year = new Date(releaseDate).getFullYear();
  return isNaN(year) ? '' : year.toString();
};

export default function ArtistDetailsScreen() {
  const route = useRoute<ArtistDetailsRouteProp>();
  const navigation = useNavigation<ArtistDetailsNavigationProp>();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { artistId } = route.params;

  const { currentArtist, currentArtistAlbums, loading, albumsLoading, error } = useSelector(
    (state: RootState) => state.artist
  );

  const [refreshing, setRefreshing] = useState(false);

  const loadArtistData = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      // Fetch artist details
      const artistResponse = await ArtistService.getArtistById(artistId);

      if (artistResponse.success && artistResponse.data) {
        dispatch(setCurrentArtist(artistResponse.data));

        // Fetch artist's albums
        dispatch(setAlbumsLoading(true));
        const albumsResponse = await ArtistService.getArtistAlbums(artistId, {
          includeGroups: 'album,single',
          limit: 50,
        });

        if (albumsResponse.success) {
          dispatch(setCurrentArtistAlbums(albumsResponse.data));
        } else {
          dispatch(setCurrentArtistAlbums([]));
        }
      } else {
        dispatch(setError(artistResponse.message || 'Artist not found'));
      }
    } catch (err) {
      console.error('Error loading artist data:', err);
      dispatch(setError('Failed to load artist'));
    }
  }, [artistId, dispatch]);

  // Use useFocusEffect to reload when screen comes into focus
  // This ensures the correct artist is loaded when navigating back
  useFocusEffect(
    useCallback(() => {
      loadArtistData();
    }, [loadArtistData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadArtistData();
    } finally {
      setRefreshing(false);
    }
  }, [loadArtistData]);

  const handleAlbumPress = useCallback(
    (albumId: string) => {
      navigation.push('AlbumDetails', { albumId });
    },
    [navigation]
  );

  const renderAlbumItem = useCallback(
    ({ item }: { item: Album }) => {
      const styles = createStyles(theme);
      return (
        <TouchableOpacity
          style={styles.albumCard}
          onPress={() => handleAlbumPress(item.id)}
          activeOpacity={0.7}
        >
          <FastImage
            source={{ uri: item.coverImageUrl, priority: FastImage.priority.normal }}
            style={styles.albumCover}
            resizeMode={FastImage.resizeMode.cover}
          />
          <Text variant="bodyMedium" style={styles.albumTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text variant="bodySmall" style={styles.albumYear}>
            {getAlbumYear(item.releaseDate)}
          </Text>
        </TouchableOpacity>
      );
    },
    [theme, handleAlbumPress]
  );

  const styles = createStyles(theme);

  // Show loading if we're fetching data OR if the currentArtist doesn't match the requested artistId
  // This prevents showing the wrong artist data when navigating between artists
  if (loading || !currentArtist || currentArtist.id !== artistId) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading artist...
        </Text>
      </View>
    );
  }

  // Error state (only show if we've tried to load and got an error)
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="headlineSmall" style={styles.errorTitle}>
          Oops!
        </Text>
        <Text variant="bodyLarge" style={styles.errorText}>
          {error}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadArtistData}
        >
          <Text variant="bodyLarge" style={styles.retryButtonText}>
            Try Again
          </Text>
        </TouchableOpacity>
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
      {/* Artist Header */}
      <View style={styles.header}>
        <FastImage
          source={{ uri: currentArtist.imageUrl, priority: FastImage.priority.high }}
          style={styles.artistImage}
          resizeMode={FastImage.resizeMode.cover}
        />
        <Text variant="headlineLarge" style={styles.artistName}>
          {currentArtist.name}
        </Text>

        {currentArtist.followerCount !== undefined && (
          <Text variant="bodyLarge" style={styles.followers}>
            {formatFollowers(currentArtist.followerCount)} followers
          </Text>
        )}

        {/* Genres */}
        {currentArtist.genres && currentArtist.genres.length > 0 && (
          <View style={styles.genresContainer}>
            {currentArtist.genres.slice(0, 5).map((genre, index) => (
              <Chip key={index} style={styles.genreChip} compact>
                {genre}
              </Chip>
            ))}
          </View>
        )}
      </View>

      {/* Banner Ad */}
      <View style={styles.adContainer}>
        <BannerAdComponent />
      </View>

      {/* Albums Section */}
      <View style={styles.albumsSection}>
        <View style={styles.albumsHeader}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Albums & Singles
          </Text>
          {currentArtistAlbums.length > 0 && (
            <Text variant="bodyMedium" style={styles.albumCount}>
              {currentArtistAlbums.length}
            </Text>
          )}
        </View>

        {albumsLoading ? (
          <View style={styles.albumsLoadingContainer}>
            <ActivityIndicator size="large" />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Loading albums...
            </Text>
          </View>
        ) : currentArtistAlbums.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No albums found
            </Text>
          </View>
        ) : (
          <FlatList
            data={currentArtistAlbums}
            renderItem={renderAlbumItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.albumsRow}
            scrollEnabled={false}
            contentContainerStyle={styles.albumsGrid}
          />
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: spacing.lg,
    },
    header: {
      padding: spacing.lg,
      alignItems: 'center',
      paddingBottom: spacing.xl,
    },
    artistImage: {
      width: ARTIST_IMAGE_SIZE,
      height: ARTIST_IMAGE_SIZE,
      borderRadius: ARTIST_IMAGE_SIZE / 2,
      marginBottom: spacing.lg,
      ...shadows.large,
    },
    artistName: {
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: spacing.sm,
      color: theme.colors.onBackground,
    },
    followers: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    genresContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    genreChip: {
      marginBottom: spacing.sm,
    },
    adContainer: {
      marginVertical: spacing.lg,
      alignItems: 'center',
      paddingBottom: spacing.lg,
    },
    albumsSection: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.lg,
    },
    albumsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontWeight: '600',
      color: theme.colors.onBackground,
    },
    albumCount: {
      color: theme.colors.onSurfaceVariant,
    },
    albumsGrid: {
      paddingBottom: spacing.md,
    },
    albumsRow: {
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    albumCard: {
      width: ALBUM_CARD_WIDTH,
      marginBottom: spacing.md,
    },
    albumCover: {
      width: ALBUM_CARD_WIDTH,
      height: ALBUM_CARD_WIDTH,
      borderRadius: 8,
      marginBottom: spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
    },
    albumTitle: {
      fontWeight: '500',
      marginBottom: spacing.xs,
      color: theme.colors.onBackground,
    },
    albumYear: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    albumsLoadingContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    loadingText: {
      marginTop: spacing.md,
      color: theme.colors.onSurfaceVariant,
    },
    errorTitle: {
      fontWeight: 'bold',
      marginBottom: spacing.md,
      color: theme.colors.error,
    },
    errorText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    bottomPadding: {
      height: spacing.xl,
    },
  });

