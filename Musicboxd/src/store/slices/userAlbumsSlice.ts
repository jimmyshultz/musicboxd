import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userAlbumsService, UserAlbumInteraction, UserAlbumStats, AlbumWithInteraction } from '../../services/userAlbumsService';

interface UserAlbumsState {
  interactions: Record<string, UserAlbumInteraction>; // Keyed by album_id
  listeningHistory: AlbumWithInteraction[];
  ratedAlbums: AlbumWithInteraction[];
  stats: UserAlbumStats | null;
  loading: {
    interactions: boolean;
    listeningHistory: boolean;
    ratedAlbums: boolean;
    stats: boolean;
    markAsListened: boolean;
    rating: boolean;
  };
  error: string | null;
}

const initialState: UserAlbumsState = {
  interactions: {},
  listeningHistory: [],
  ratedAlbums: [],
  stats: null,
  loading: {
    interactions: false,
    listeningHistory: false,
    ratedAlbums: false,
    stats: false,
    markAsListened: false,
    rating: false,
  },
  error: null,
};

// Async thunks
export const markAlbumAsListened = createAsyncThunk(
  'userAlbums/markAsListened',
  async ({ userId, albumId, listenedAt }: { userId: string; albumId: string; listenedAt?: Date }) => {
    const interaction = await userAlbumsService.markAsListened(userId, albumId, listenedAt);
    return interaction;
  }
);

export const unmarkAlbumAsListened = createAsyncThunk(
  'userAlbums/unmarkAsListened',
  async ({ userId, albumId }: { userId: string; albumId: string }) => {
    const interaction = await userAlbumsService.unmarkAsListened(userId, albumId);
    return interaction;
  }
);

export const rateAlbum = createAsyncThunk(
  'userAlbums/rateAlbum',
  async ({ userId, albumId, rating }: { userId: string; albumId: string; rating: number }) => {
    const interaction = await userAlbumsService.rateAlbum(userId, albumId, rating);
    return interaction;
  }
);

export const removeAlbumRating = createAsyncThunk(
  'userAlbums/removeRating',
  async ({ userId, albumId }: { userId: string; albumId: string }) => {
    const interaction = await userAlbumsService.removeRating(userId, albumId);
    return interaction;
  }
);

export const fetchUserAlbumInteractions = createAsyncThunk(
  'userAlbums/fetchInteractions',
  async ({ userId, albumIds }: { userId: string; albumIds: string[] }) => {
    const interactions = await userAlbumsService.getUserAlbumInteractions(userId, albumIds);
    return interactions;
  }
);

export const fetchUserListeningHistory = createAsyncThunk(
  'userAlbums/fetchListeningHistory',
  async ({ userId, limit = 50, offset = 0 }: { userId: string; limit?: number; offset?: number }) => {
    const history = await userAlbumsService.getUserListeningHistory(userId, limit, offset);
    return { history, offset };
  }
);

export const fetchUserRatedAlbums = createAsyncThunk(
  'userAlbums/fetchRatedAlbums',
  async ({ userId, limit = 50, offset = 0 }: { userId: string; limit?: number; offset?: number }) => {
    const albums = await userAlbumsService.getUserRatedAlbums(userId, limit, offset);
    return { albums, offset };
  }
);

export const fetchUserAlbumStats = createAsyncThunk(
  'userAlbums/fetchStats',
  async (userId: string) => {
    const stats = await userAlbumsService.getUserAlbumStats(userId);
    return stats;
  }
);

const userAlbumsSlice = createSlice({
  name: 'userAlbums',
  initialState,
  reducers: {
    clearUserAlbumsError: (state) => {
      state.error = null;
    },
    resetUserAlbumsState: () => {
      return initialState;
    },
    updateLocalInteraction: (state, action: PayloadAction<UserAlbumInteraction>) => {
      state.interactions[action.payload.album_id] = action.payload;
    },
    removeLocalInteraction: (state, action: PayloadAction<string>) => {
      delete state.interactions[action.payload];
    },
  },
  extraReducers: (builder) => {
    // Mark as listened
    builder
      .addCase(markAlbumAsListened.pending, (state) => {
        state.loading.markAsListened = true;
        state.error = null;
      })
      .addCase(markAlbumAsListened.fulfilled, (state, action) => {
        state.loading.markAsListened = false;
        state.interactions[action.payload.album_id] = action.payload;
      })
      .addCase(markAlbumAsListened.rejected, (state, action) => {
        state.loading.markAsListened = false;
        state.error = action.error.message || 'Failed to mark album as listened';
      });

    // Unmark as listened
    builder
      .addCase(unmarkAlbumAsListened.pending, (state) => {
        state.loading.markAsListened = true;
        state.error = null;
      })
      .addCase(unmarkAlbumAsListened.fulfilled, (state, action) => {
        state.loading.markAsListened = false;
        state.interactions[action.payload.album_id] = action.payload;
      })
      .addCase(unmarkAlbumAsListened.rejected, (state, action) => {
        state.loading.markAsListened = false;
        state.error = action.error.message || 'Failed to unmark album as listened';
      });

    // Rate album
    builder
      .addCase(rateAlbum.pending, (state) => {
        state.loading.rating = true;
        state.error = null;
      })
      .addCase(rateAlbum.fulfilled, (state, action) => {
        state.loading.rating = false;
        state.interactions[action.payload.album_id] = action.payload;
      })
      .addCase(rateAlbum.rejected, (state, action) => {
        state.loading.rating = false;
        state.error = action.error.message || 'Failed to rate album';
      });

    // Remove rating
    builder
      .addCase(removeAlbumRating.pending, (state) => {
        state.loading.rating = true;
        state.error = null;
      })
      .addCase(removeAlbumRating.fulfilled, (state, action) => {
        state.loading.rating = false;
        state.interactions[action.payload.album_id] = action.payload;
      })
      .addCase(removeAlbumRating.rejected, (state, action) => {
        state.loading.rating = false;
        state.error = action.error.message || 'Failed to remove rating';
      });

    // Fetch interactions
    builder
      .addCase(fetchUserAlbumInteractions.pending, (state) => {
        state.loading.interactions = true;
        state.error = null;
      })
      .addCase(fetchUserAlbumInteractions.fulfilled, (state, action) => {
        state.loading.interactions = false;
        state.interactions = { ...state.interactions, ...action.payload };
      })
      .addCase(fetchUserAlbumInteractions.rejected, (state, action) => {
        state.loading.interactions = false;
        state.error = action.error.message || 'Failed to fetch album interactions';
      });

    // Fetch listening history
    builder
      .addCase(fetchUserListeningHistory.pending, (state) => {
        state.loading.listeningHistory = true;
        state.error = null;
      })
      .addCase(fetchUserListeningHistory.fulfilled, (state, action) => {
        state.loading.listeningHistory = false;
        if (action.payload.offset === 0) {
          // Replace history if starting from the beginning
          state.listeningHistory = action.payload.history;
        } else {
          // Append to existing history for pagination
          state.listeningHistory = [...state.listeningHistory, ...action.payload.history];
        }
      })
      .addCase(fetchUserListeningHistory.rejected, (state, action) => {
        state.loading.listeningHistory = false;
        state.error = action.error.message || 'Failed to fetch listening history';
      });

    // Fetch rated albums
    builder
      .addCase(fetchUserRatedAlbums.pending, (state) => {
        state.loading.ratedAlbums = true;
        state.error = null;
      })
      .addCase(fetchUserRatedAlbums.fulfilled, (state, action) => {
        state.loading.ratedAlbums = false;
        if (action.payload.offset === 0) {
          // Replace albums if starting from the beginning
          state.ratedAlbums = action.payload.albums;
        } else {
          // Append to existing albums for pagination
          state.ratedAlbums = [...state.ratedAlbums, ...action.payload.albums];
        }
      })
      .addCase(fetchUserRatedAlbums.rejected, (state, action) => {
        state.loading.ratedAlbums = false;
        state.error = action.error.message || 'Failed to fetch rated albums';
      });

    // Fetch stats
    builder
      .addCase(fetchUserAlbumStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchUserAlbumStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchUserAlbumStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.error.message || 'Failed to fetch user stats';
      });
  },
});

export const {
  clearUserAlbumsError,
  resetUserAlbumsState,
  updateLocalInteraction,
  removeLocalInteraction,
} = userAlbumsSlice.actions;

export default userAlbumsSlice.reducer;