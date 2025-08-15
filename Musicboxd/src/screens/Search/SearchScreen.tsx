import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import {
  Text,
  Chip,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash';

import { SearchStackParamList, Album } from '../../types';
import { RootState } from '../../store';
import {
  setSearchQuery,
  searchStart,
  searchSuccess,
  addRecentSearch,
  setTrendingAlbums,
} from '../../store/slices/searchSlice';
import { AlbumService } from '../../services/albumService';
import { theme, spacing } from '../../utils/theme';

type SearchScreenNavigationProp = StackNavigationProp<SearchStackParamList>;

// Custom search input component to replace react-native-paper Searchbar
const CustomSearchbar = ({ 
  placeholder, 
  onChangeText, 
  onSubmitEditing, 
  value, 
  style 
}: {
  placeholder: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  value: string;
  style?: any;
}) => {
  return (
    <View style={[styles.searchInputContainer, style]}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        value={value}
        placeholderTextColor={theme.colors.textSecondary}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const dispatch = useDispatch();
  
  const {
    searchQuery,
    searchResults,
    recentSearches,
    trendingAlbums,
    loading,
  } = useSelector((state: RootState) => state.search);

  const [popularGenres, setPopularGenres] = useState<string[]>([]);

  const loadInitialData = useCallback(async () => {
    try {
      const [trendingResponse, genresResponse] = await Promise.all([
        AlbumService.getTrendingAlbums(),
        AlbumService.getPopularGenres(),
      ]);

      if (trendingResponse.success) {
        dispatch(setTrendingAlbums(trendingResponse.data));
      }

      if (genresResponse.success) {
        setPopularGenres(genresResponse.data);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const performSearch = useCallback(async (query: string) => {
    if (query.trim()) {
      dispatch(searchStart());
      try {
        const response = await AlbumService.searchAlbums(query);
        if (response.success) {
          dispatch(searchSuccess(response.data));
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }
  }, [dispatch]);

  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [performSearch]
  );

  const handleSearchChange = (query: string) => {
    dispatch(setSearchQuery(query));
    if (query.trim()) {
      debouncedSearch(query);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      dispatch(addRecentSearch(searchQuery));
    }
  };

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const handleGenrePress = (genre: string) => {
    dispatch(setSearchQuery(genre));
    debouncedSearch(genre);
  };

  const handleRecentSearchPress = (query: string) => {
    dispatch(setSearchQuery(query));
    debouncedSearch(query);
  };

  const renderAlbumItem = ({ item }: { item: Album }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => navigateToAlbum(item.id)}
    >
      <Image source={{ uri: item.coverImageUrl }} style={styles.albumCoverSmall} />
      <View style={styles.albumDetailsContainer}>
        <Text variant="titleMedium" numberOfLines={2} style={styles.albumTitle}>
          {item.title}
        </Text>
        <Text variant="bodyMedium" style={styles.artistName}>
          {item.artist}
        </Text>
        <Text variant="bodySmall" style={styles.albumYear}>
          {AlbumService.getAlbumYear(item.releaseDate)} • {item.genre.join(', ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingAlbum = (album: Album) => (
    <TouchableOpacity
      key={album.id}
      style={styles.trendingAlbum}
      onPress={() => navigateToAlbum(album.id)}
    >
      <Image source={{ uri: album.coverImageUrl }} style={styles.trendingCover} />
      <Text variant="bodySmall" numberOfLines={2} style={styles.trendingTitle}>
        {album.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.trendingArtist}>
        {album.artist}
      </Text>
    </TouchableOpacity>
  );

  const showSearchResults = searchQuery.trim() && searchResults;
  const showEmptyState = searchQuery.trim() && searchResults && searchResults.albums.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <CustomSearchbar
          placeholder="Search albums, artists, genres..."
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearchSubmit}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      )}

      {showSearchResults && !loading && (
        <FlatList
          data={searchResults.albums}
          renderItem={renderAlbumItem}
          keyExtractor={(item) => item.id}
          style={styles.searchResults}
          showsVerticalScrollIndicator={false}
        />
      )}

      {showEmptyState && !loading && (
        <View style={styles.emptyStateContainer}>
          <Text variant="bodyLarge" style={styles.emptyStateText}>
            No albums found for "{searchQuery}"
          </Text>
          <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
            Try searching for a different artist or album name
          </Text>
        </View>
      )}

      {!searchQuery.trim() && (
        <ScrollView style={styles.discoveryContainer} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Recent Searches
              </Text>
              <View style={styles.chipsContainer}>
                {recentSearches.slice(0, 5).map((search, index) => (
                  <Chip
                    key={index}
                    onPress={() => handleRecentSearchPress(search)}
                    style={styles.chip}
                  >
                    {search}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {/* Popular Genres */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Popular Genres
            </Text>
            <View style={styles.chipsContainer}>
              {popularGenres.slice(0, 8).map((genre, index) => (
                <Chip
                  key={index}
                  onPress={() => handleGenrePress(genre)}
                  style={styles.chip}
                  mode="outlined"
                >
                  {genre}
                </Chip>
              ))}
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Trending Albums */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Trending Albums
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.trendingContainer}>
                {trendingAlbums.map((album) => renderTrendingAlbum(album))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  searchResultItem: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  albumCoverSmall: {
    width: 60,
    height: 60,
    borderRadius: 4,
    resizeMode: 'cover',
  },
  albumDetailsContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  albumTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  artistName: {
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  albumYear: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  discoveryContainer: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    marginBottom: spacing.sm,
  },
  divider: {
    marginVertical: spacing.md,
  },
  trendingContainer: {
    flexDirection: 'row',
    paddingLeft: spacing.lg,
  },
  trendingAlbum: {
    width: 120,
    marginRight: spacing.md,
  },
  trendingCover: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: spacing.sm,
    resizeMode: 'cover',
  },
  trendingTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  trendingArtist: {
    color: theme.colors.textSecondary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
  },
  searchIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  clearButton: {
    padding: spacing.sm,
  },
  clearIcon: {
    fontSize: 20,
  },
});