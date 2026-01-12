import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Album, Review, Listen } from '../../types';

interface AlbumState {
  albums: Album[];
  currentAlbum: Album | null;
  userReviews: Review[];
  userListens: Listen[];
  popularAlbums: Album[];
  currentAlbumUserReview: Review | null;
  currentAlbumIsListened: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AlbumState = {
  albums: [],
  currentAlbum: null,
  userReviews: [],
  userListens: [],
  popularAlbums: [],
  currentAlbumUserReview: null,
  currentAlbumIsListened: false,
  loading: false,
  error: null,
};

const albumSlice = createSlice({
  name: 'albums',
  initialState,
  reducers: {
    fetchAlbumsStart: state => {
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
    clearCurrentAlbum: state => {
      state.currentAlbum = null;
      state.currentAlbumUserReview = null;
      state.currentAlbumIsListened = false;
    },
    addReview: (state, action: PayloadAction<Review>) => {
      state.userReviews.push(action.payload);
    },
    updateReview: (state, action: PayloadAction<Review>) => {
      const index = state.userReviews.findIndex(
        r => r.id === action.payload.id,
      );
      if (index !== -1) {
        state.userReviews[index] = action.payload;
      }
    },
    removeReview: (state, action: PayloadAction<string>) => {
      state.userReviews = state.userReviews.filter(
        r => r.id !== action.payload,
      );
    },
    addListen: (state, action: PayloadAction<Listen>) => {
      state.userListens.push(action.payload);
    },
    removeListen: (
      state,
      action: PayloadAction<{ userId: string; albumId: string }>,
    ) => {
      state.userListens = state.userListens.filter(
        listen =>
          !(
            listen.userId === action.payload.userId &&
            listen.albumId === action.payload.albumId
          ),
      );
    },
    setPopularAlbums: (state, action: PayloadAction<Album[]>) => {
      state.popularAlbums = action.payload;
    },
    setCurrentAlbumUserReview: (
      state,
      action: PayloadAction<Review | null>,
    ) => {
      state.currentAlbumUserReview = action.payload;
      // Update the review in userReviews array if it exists
      if (action.payload) {
        const index = state.userReviews.findIndex(
          r => r.id === action.payload!.id,
        );
        if (index !== -1) {
          state.userReviews[index] = action.payload;
        } else {
          state.userReviews.push(action.payload);
        }
      }
    },
    setCurrentAlbumIsListened: (state, action: PayloadAction<boolean>) => {
      state.currentAlbumIsListened = action.payload;
    },
    clearError: state => {
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
  removeListen,
  setPopularAlbums,
  setCurrentAlbumUserReview,
  setCurrentAlbumIsListened,
  clearError,
} = albumSlice.actions;

export default albumSlice.reducer;
