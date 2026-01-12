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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { HomeStackParamList, Album } from '../../types';
import { AlbumService } from '../../services/albumService';
import { spacing } from '../../utils/theme';

type PopularThisWeekNavigationProp = StackNavigationProp<HomeStackParamList>;

const CARDS_PER_ROW = 3;

export default function PopularThisWeekScreen() {
  const navigation = useNavigation<PopularThisWeekNavigationProp>();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // Responsive spacing calculation: use percentage-based approach for consistent layout
  const HORIZONTAL_SPACING = Math.max(spacing.md, width * 0.04); // 4% of screen width, minimum 16
  const CARD_MARGIN = Math.max(spacing.xs, width * 0.015); // 1.5% of screen width, minimum 4

  const albumCardWidth =
    (width - HORIZONTAL_SPACING * 2 - CARD_MARGIN * (CARDS_PER_ROW - 1)) /
    CARDS_PER_ROW;
  const styles = createStyles(
    theme,
    albumCardWidth,
    HORIZONTAL_SPACING,
    CARD_MARGIN,
  );
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPopularAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const response = await AlbumService.getPopularAlbums();
      if (response.success) {
        // Use original album data without duplicates or modifications
        setAlbums(response.data);
      }
    } catch (error) {
      console.error('Error loading popular albums:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPopularAlbums();
  }, [loadPopularAlbums]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPopularAlbums();
    } finally {
      setRefreshing(false);
    }
  }, [loadPopularAlbums]);

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const renderAlbumCard = (album: Album, index: number) => {
    const isLastInRow = (index + 1) % CARDS_PER_ROW === 0;

    return (
      <TouchableOpacity
        key={album.id}
        style={[styles.albumCard, isLastInRow && styles.albumCardLastInRow]}
        onPress={() => navigateToAlbum(album.id)}
      >
        <FastImage
          source={{
            uri: album.coverImageUrl,
            priority: FastImage.priority.normal,
          }}
          style={styles.albumCover}
          resizeMode={FastImage.resizeMode.cover}
        />
        <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
          {album.title}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
          {album.artist}
        </Text>
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
      <View style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text variant="bodyLarge" style={styles.loadingText}>
              Loading popular albums...
            </Text>
          </View>
        </View>
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
