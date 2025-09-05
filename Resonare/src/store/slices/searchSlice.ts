import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Album, SearchResult } from '../../types';

interface SearchState {
  searchQuery: string;
  searchResults: SearchResult | null;
  recentSearches: string[];
  trendingAlbums: Album[];
  loading: boolean;
  error: string | null;
}

const initialState: SearchState = {
  searchQuery: '',
  searchResults: null,
  recentSearches: [],
  trendingAlbums: [],
  loading: false,
  error: null,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    searchStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    searchSuccess: (state, action: PayloadAction<SearchResult>) => {
      state.loading = false;
      state.searchResults = action.payload;
    },
    searchFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addRecentSearch: (state, action: PayloadAction<string>) => {
      const query = action.payload.trim();
      if (query && !state.recentSearches.includes(query)) {
        state.recentSearches.unshift(query);
        // Keep only the 10 most recent searches
        state.recentSearches = state.recentSearches.slice(0, 10);
      }
    },
    clearRecentSearches: (state) => {
      state.recentSearches = [];
    },
    setTrendingAlbums: (state, action: PayloadAction<Album[]>) => {
      state.trendingAlbums = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = null;
      state.searchQuery = '';
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setSearchQuery,
  searchStart,
  searchSuccess,
  searchFailure,
  addRecentSearch,
  clearRecentSearches,
  setTrendingAlbums,
  clearSearchResults,
  clearError,
} = searchSlice.actions;

export default searchSlice.reducer;