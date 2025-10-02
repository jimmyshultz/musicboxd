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
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { HomeStackParamList, Album } from '../../types';
import { AlbumService } from '../../services/albumService';
import { useAppTheme } from '../../providers/ThemeProvider';

type PopularThisWeekNavigationProp = StackNavigationProp<HomeStackParamList>;

const { width } = Dimensions.get('window');
const CARDS_PER_ROW = 3;

export default function PopularThisWeekScreen() {
  const navigation = useNavigation<PopularThisWeekNavigationProp>();
  const { theme, spacing } = useAppTheme();
  const colors = theme.colors;
  
  const HORIZONTAL_SPACING = spacing.lg;
  const CARD_MARGIN = spacing.sm;
  const ALBUM_CARD_WIDTH = (width - (HORIZONTAL_SPACING * 2) - (CARD_MARGIN * (CARDS_PER_ROW - 1))) / CARDS_PER_ROW;
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

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
        <Image source={{ uri: album.coverImageUrl }} style={styles.albumCover} />
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
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {albums.map((album, index) => renderAlbumCard(album, index))}
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
    paddingHorizontal: HORIZONTAL_SPACING,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'flex-start',
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
    marginBottom: spacing.lg,
    marginRight: CARD_MARGIN,
    position: 'relative',
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
    color: colors.textSecondary,
    lineHeight: 14,
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