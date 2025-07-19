import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Album, Review, Listen } from '../../types';

interface AlbumState {
  albums: Album[];
  currentAlbum: Album | null;
  userReviews: Review[];
  userListens: Listen[];
  popularAlbums: Album[];
  loading: boolean;
  error: string | null;
}

const initialState: AlbumState = {
  albums: [],
  currentAlbum: null,
  userReviews: [],
  userListens: [],
  popularAlbums: [],
  loading: false,
  error: null,
};

const albumSlice = createSlice({
  name: 'albums',
  initialState,
  reducers: {
    fetchAlbumsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchAlbumsSuccess: (state, action: PayloadAction<Album[]>) => {
      state.loading = false;
      state.albums = action.payload;
    },
    fetchAlbumsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setCurrentAlbum: (state, action: PayloadAction<Album>) => {
      state.currentAlbum = action.payload;
    },
    clearCurrentAlbum: (state) => {
      state.currentAlbum = null;
    },
    addReview: (state, action: PayloadAction<Review>) => {
      state.userReviews.push(action.payload);
    },
    updateReview: (state, action: PayloadAction<Review>) => {
      const index = state.userReviews.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.userReviews[index] = action.payload;
      }
    },
    removeReview: (state, action: PayloadAction<string>) => {
      state.userReviews = state.userReviews.filter(r => r.id !== action.payload);
    },
    addListen: (state, action: PayloadAction<Listen>) => {
      state.userListens.push(action.payload);
    },
    setPopularAlbums: (state, action: PayloadAction<Album[]>) => {
      state.popularAlbums = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchAlbumsStart,
  fetchAlbumsSuccess,
  fetchAlbumsFailure,
  setCurrentAlbum,
  clearCurrentAlbum,
  addReview,
  updateReview,
  removeReview,
  addListen,
  setPopularAlbums,
  clearError,
} = albumSlice.actions;

export default albumSlice.reducer;