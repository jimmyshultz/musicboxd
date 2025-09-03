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
import { Text, ActivityIndicator, Searchbar } from 'react-native-paper';
import { useSelector } from 'react-redux';

import { Album } from '../../types';
import { RootState } from '../../store';
import Icon from 'react-native-vector-icons/FontAwesome';
import { AlbumService } from '../../services/albumService';
import { favoriteAlbumsService } from '../../services/favoriteAlbumsService';
import { colors, spacing } from '../../utils/theme';

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (width - spacing.lg * 4) / 3; // 3 columns


export default function FavoriteAlbumsManagementScreen() {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadFavoriteAlbums = useCallback(async () => {
    if (!currentUser?.id) {
      setFavoriteAlbums([]);
      return;
    }

    try {
      // Get favorite albums from database
      const favoriteAlbumsData = await favoriteAlbumsService.getUserFavoriteAlbums(currentUser.id, 100);
      
      // Convert to the Album format expected by the UI
      const albums = favoriteAlbumsData.map(favorite => ({
        id: favorite.albums.id,
        title: favorite.albums.name,
        artist: favorite.albums.artist_name,
        releaseDate: favorite.albums.release_date || '',
        genre: favorite.albums.genres || [],
        coverImageUrl: favorite.albums.image_url || '',
        spotifyUrl: favorite.albums.spotify_url || '',
        totalTracks: favorite.albums.total_tracks || 0,
        albumType: favorite.albums.album_type || 'album',
        trackList: [], // Empty for now
      }));
      
      setFavoriteAlbums(albums);
    } catch (error) {
      console.error('Error loading favorite albums:', error);
    }
  }, [currentUser?.id]);

  const searchAlbums = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      // Use real search API to search Spotify's full catalog
      const response = await AlbumService.searchAlbums(query);
      if (response.success && response.data) {
        setSearchResults(response.data.albums);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching albums:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavoriteAlbums();
  }, [loadFavoriteAlbums]);

  const addToFavorites = async (album: Album) => {
    if (!currentUser?.id) return;
    
    if (favoriteAlbums.length >= 5) {
      // Could show a toast/alert here
      return;
    }
    
    if (!favoriteAlbums.find(fav => fav.id === album.id)) {
      try {
        // Find the next available ranking (1-5)
        const nextRanking = favoriteAlbums.length + 1;
        await favoriteAlbumsService.addToFavorites(currentUser.id, album.id, nextRanking);
        
        // Reload favorites to get the updated rankings
        await loadFavoriteAlbums();
        
        console.log('Added to favorites:', album.title, 'at ranking', nextRanking);
      } catch (error) {
        console.error('Error adding to favorites:', error);
      }
    }
  };

  const removeFromFavorites = async (albumId: string) => {
    if (!currentUser?.id) return;
    
    try {
      await favoriteAlbumsService.removeFromFavorites(currentUser.id, albumId);
      
      // Reload favorites to get the updated rankings (others may shift up)
      await loadFavoriteAlbums();
      
      console.log('Removed from favorites:', albumId);
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  const renderFavoriteAlbum = (album: Album, index: number) => (
    <View key={album.id} style={styles.favoriteAlbumCard}>
      <TouchableOpacity onPress={() => removeFromFavorites(album.id)}>
        <Image source={{ uri: album.coverImageUrl }} style={styles.albumCover} />
        <View style={styles.removeButton}>
          <Icon name="times" size={16} color="#fff" />
        </View>
      </TouchableOpacity>
      <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
        {album.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
        {album.artist}
      </Text>
      <View style={styles.positionBadge}>
        <Text style={styles.positionText}>#{index + 1}</Text>
      </View>
    </View>
  );

  const renderSearchResult = (album: Album) => {
    const isAlreadyFavorite = favoriteAlbums.find(fav => fav.id === album.id);
    const canAddMore = favoriteAlbums.length < 5;
    
    return (
      <TouchableOpacity
        key={album.id}
        style={[styles.searchResultCard, isAlreadyFavorite && styles.searchResultCardSelected]}
        onPress={() => canAddMore && !isAlreadyFavorite ? addToFavorites(album) : null}
        disabled={!!isAlreadyFavorite || !canAddMore}
      >
        <Image source={{ uri: album.coverImageUrl }} style={styles.searchAlbumCover} />
        <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
          {album.title}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
          {album.artist}
        </Text>
        {isAlreadyFavorite && (
          <View style={styles.selectedBadge}>
            <Icon name="check" size={16} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Favorite Albums
        </Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Current Favorites */}
        {favoriteAlbums.length > 0 && (
          <View style={styles.section}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              Your Favorites ({favoriteAlbums.length}/5)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.favoritesRow}>
                {favoriteAlbums.map((album, index) => renderFavoriteAlbum(album, index))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Search Section */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Add Albums
          </Text>
          <Searchbar
            placeholder="Search for albums..."
            onChangeText={(query) => {
              setSearchQuery(query);
              searchAlbums(query);
            }}
            value={searchQuery}
            style={styles.searchbar}
          />
          
          {favoriteAlbums.length >= 5 && (
            <Text variant="bodySmall" style={styles.limitWarning}>
              You can only have 5 favorite albums. Remove some to add new ones.
            </Text>
          )}
        </View>

        {/* Search Results */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        )}

        {hasSearched && !loading && searchResults.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No albums found for "{searchQuery}"
            </Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={styles.searchResultsGrid}>
            {searchResults.map(renderSearchResult)}
          </View>
        )}
      </ScrollView>
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
    width: 48,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  favoritesRow: {
    flexDirection: 'row',
    paddingRight: spacing.lg,
  },
  favoriteAlbumCard: {
    width: ALBUM_CARD_WIDTH,
    marginRight: spacing.md,
    position: 'relative',
  },
  albumCover: {
    width: ALBUM_CARD_WIDTH,
    height: ALBUM_CARD_WIDTH,
    borderRadius: 8,
    marginBottom: spacing.sm,
    resizeMode: 'cover',
  },
  searchAlbumCover: {
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
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  positionBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  positionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  searchbar: {
    marginBottom: spacing.md,
  },
  limitWarning: {
    color: colors.error || '#ff6b6b',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchResultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  searchResultCard: {
    width: ALBUM_CARD_WIDTH,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  searchResultCardSelected: {
    opacity: 0.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});