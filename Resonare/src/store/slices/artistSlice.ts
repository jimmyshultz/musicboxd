import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Artist, Album } from '../../types';

interface ArtistState {
  currentArtist: Artist | null;
  currentArtistAlbums: Album[];
  loading: boolean;
  albumsLoading: boolean;
  error: string | null;
}

const initialState: ArtistState = {
  currentArtist: null,
  currentArtistAlbums: [],
  loading: false,
  albumsLoading: false,
  error: null,
};

const artistSlice = createSlice({
  name: 'artist',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setAlbumsLoading: (state, action: PayloadAction<boolean>) => {
      state.albumsLoading = action.payload;
    },
    setCurrentArtist: (state, action: PayloadAction<Artist>) => {
      state.currentArtist = action.payload;
      state.loading = false;
      state.error = null;
    },
    clearCurrentArtist: (state) => {
      state.currentArtist = null;
      state.currentArtistAlbums = [];
      state.loading = false;
      state.albumsLoading = false;
      state.error = null;
    },
    setCurrentArtistAlbums: (state, action: PayloadAction<Album[]>) => {
      state.currentArtistAlbums = action.payload;
      state.albumsLoading = false;
    },
    addAlbumToArtist: (state, action: PayloadAction<Album>) => {
      // Add album if it doesn't already exist
      const exists = state.currentArtistAlbums.some(album => album.id === action.payload.id);
      if (!exists) {
        state.currentArtistAlbums.push(action.payload);
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
      state.albumsLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setAlbumsLoading,
  setCurrentArtist,
  clearCurrentArtist,
  setCurrentArtistAlbums,
  addAlbumToArtist,
  setError,
  clearError,
} = artistSlice.actions;

export default artistSlice.reducer;

