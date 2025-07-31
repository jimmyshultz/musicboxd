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
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { HomeStackParamList, Album } from '../../types';
import { AlbumService } from '../../services/albumService';
import { colors, spacing } from '../../utils/theme';

type PopularThisWeekNavigationProp = StackNavigationProp<HomeStackParamList>;

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (width - spacing.lg * 4) / 3; // 3 columns with proper spacing

// Icon component to avoid creating it during render
const arrowIconStyle = { fontSize: 20, color: '#666' };
const ArrowLeftIcon = (props: any) => <Text style={{ ...arrowIconStyle, color: props.color || '#666' }}>←</Text>;

export default function PopularThisWeekScreen() {
  const navigation = useNavigation<PopularThisWeekNavigationProp>();
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

  const renderAlbumCard = (album: Album, index: number) => (
    <TouchableOpacity
      key={album.id}
      style={styles.albumCard}
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text variant="bodyLarge" style={styles.loadingText}>
              Loading popular albums...
            </Text>
          </View>
        </View>
      </SafeAreaView>
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
            Popular This Week
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