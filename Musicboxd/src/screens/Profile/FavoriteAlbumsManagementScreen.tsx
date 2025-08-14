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
import { Text, ActivityIndicator, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';

import { ProfileStackParamList, Album } from '../../types';
import { RootState } from '../../store';
import { updateProfile } from '../../store/slices/authSlice';
import { AlbumService } from '../../services/albumService';
import { colors, spacing } from '../../utils/theme';

type FavoriteAlbumsManagementNavigationProp = StackNavigationProp<ProfileStackParamList>;

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (width - spacing.lg * 4) / 3; // 3 columns


export default function FavoriteAlbumsManagementScreen() {
  const navigation = useNavigation<FavoriteAlbumsManagementNavigationProp>();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadFavoriteAlbums = useCallback(async () => {
    const currentFavoriteIds = currentUser?.preferences?.favoriteAlbumIds || [];
    
    if (currentFavoriteIds.length === 0) {
      setFavoriteAlbums([]);
      return;
    }

    try {
      // Get the actual albums matching the user's favorite IDs
      const albumPromises = currentFavoriteIds.map(albumId => 
        AlbumService.getAlbumById(albumId)
      );
      
      const albumResponses = await Promise.all(albumPromises);
      const favorites: Album[] = [];
      
      albumResponses.forEach(response => {
        if (response.success && response.data) {
          favorites.push(response.data);
        }
      });
      
      setFavoriteAlbums(favorites);
    } catch (error) {
      console.error('Error loading favorite albums:', error);
    }
  }, [currentUser?.preferences?.favoriteAlbumIds]);

  const searchAlbums = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      // Mock search by filtering popular albums
      const response = await AlbumService.getPopularAlbums();
      if (response.success) {
        const filtered = response.data.filter(album => 
          album.title.toLowerCase().includes(query.toLowerCase()) ||
          album.artist.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
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

  const addToFavorites = (album: Album) => {
    if (favoriteAlbums.length >= 5) {
      // Could show a toast/alert here
      return;
    }
    
    if (!favoriteAlbums.find(fav => fav.id === album.id)) {
      const newFavorites = [...favoriteAlbums, album];
      setFavoriteAlbums(newFavorites);
      
      // Update user preferences in Redux store
      const newFavoriteIds = newFavorites.map(fav => fav.id);
      dispatch(updateProfile({
        preferences: {
          favoriteGenres: currentUser?.preferences?.favoriteGenres || [],
          favoriteAlbumIds: newFavoriteIds,
          notifications: currentUser?.preferences?.notifications || {
            newFollowers: true,
            reviewLikes: true,
            friendActivity: true,
          },
          privacy: currentUser?.preferences?.privacy || {
            profileVisibility: 'public',
            activityVisibility: 'public',
          },
        },
      }));
      
      console.log('Added to favorites:', album.title);
    }
  };

  const removeFromFavorites = (albumId: string) => {
    const newFavorites = favoriteAlbums.filter(album => album.id !== albumId);
    setFavoriteAlbums(newFavorites);
    
    // Update user preferences in Redux store
    const newFavoriteIds = newFavorites.map(fav => fav.id);
    dispatch(updateProfile({
      preferences: {
        favoriteGenres: currentUser?.preferences?.favoriteGenres || [],
        favoriteAlbumIds: newFavoriteIds,
        notifications: currentUser?.preferences?.notifications || {
          newFollowers: true,
          reviewLikes: true,
          friendActivity: true,
        },
        privacy: currentUser?.preferences?.privacy || {
          profileVisibility: 'public',
          activityVisibility: 'public',
        },
      },
    }));
    
    console.log('Removed from favorites:', albumId);
  };

  const renderFavoriteAlbum = (album: Album, index: number) => (
    <View key={album.id} style={styles.favoriteAlbumCard}>
      <TouchableOpacity onPress={() => removeFromFavorites(album.id)}>
        <Image source={{ uri: album.coverImageUrl }} style={styles.albumCover} />
        <View style={styles.removeButton}>
          <Text style={styles.removeButtonText}>×</Text>
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
            <Text style={styles.selectedText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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