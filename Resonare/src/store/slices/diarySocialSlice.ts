import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DiaryEntryComment } from '../../types/database';
import { diaryEntriesService } from '../../services/diaryEntriesService';
import { RootState } from '../store';

interface CommentState {
  comments: DiaryEntryComment[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

interface LikeState {
  hasLiked: boolean;
  likesCount: number;
  loading: boolean;
}

interface DiarySocialState {
  // Per entry ID: comments state
  commentsByEntryId: Record<string, CommentState>;
  // Per entry ID: like state
  likesByEntryId: Record<string, LikeState>;
}

const initialState: DiarySocialState = {
  commentsByEntryId: {},
  likesByEntryId: {},
};

// Async thunks

/**
 * Load social info (likes count, comments count, has liked) for a diary entry
 */
export const loadDiaryEntrySocialInfo = createAsyncThunk(
  'diarySocial/loadSocialInfo',
  async ({ entryId, userId }: { entryId: string; userId?: string }) => {
    const socialInfo = await diaryEntriesService.getDiaryEntrySocialInfo(entryId, userId);
    return { entryId, ...socialInfo };
  }
);

/**
 * Toggle like on a diary entry
 */
export const toggleDiaryEntryLike = createAsyncThunk(
  'diarySocial/toggleLike',
  async ({ entryId, userId, currentHasLiked }: { entryId: string; userId: string; currentHasLiked?: boolean }, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const currentLikeState = state.diarySocial.likesByEntryId[entryId];
    // Use passed value if provided, otherwise read from state
    const currentlyLiked = currentHasLiked !== undefined ? currentHasLiked : (currentLikeState?.hasLiked || false);

    try {
      if (currentlyLiked) {
        const result = await diaryEntriesService.unlikeDiaryEntry(entryId, userId);
        if (!result.success) {
          throw new Error(result.message || 'Failed to unlike');
        }
        // After unlike, fetch the actual count from database
        const socialInfo = await diaryEntriesService.getDiaryEntrySocialInfo(entryId, userId);
        return { entryId, hasLiked: false, likesCount: socialInfo.likesCount };
      } else {
        const result = await diaryEntriesService.likeDiaryEntry(entryId, userId);
        if (!result.success) {
          throw new Error(result.message || 'Failed to like');
        }
        // After like, fetch the actual count from database
        const socialInfo = await diaryEntriesService.getDiaryEntrySocialInfo(entryId, userId);
        return { entryId, hasLiked: true, likesCount: socialInfo.likesCount };
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to toggle like');
    }
  }
);

/**
 * Load comments for a diary entry
 */
export const loadDiaryEntryComments = createAsyncThunk(
  'diarySocial/loadComments',
  async ({ entryId, reset = false }: { entryId: string; reset?: boolean }) => {
    const currentState = initialState.commentsByEntryId[entryId];
    const offset = reset ? 0 : (currentState?.comments.length || 0);
    
    const comments = await diaryEntriesService.getDiaryEntryComments(entryId, {
      limit: 50,
      offset,
    });

    return { entryId, comments, reset, hasMore: comments.length === 50 };
  }
);

/**
 * Create a comment on a diary entry
 */
export const createDiaryEntryComment = createAsyncThunk(
  'diarySocial/createComment',
  async ({ entryId, userId, body }: { entryId: string; userId: string; body: string }, { rejectWithValue }) => {
    const result = await diaryEntriesService.createDiaryEntryComment(entryId, userId, body);
    if (!result.success || !result.comment) {
      return rejectWithValue(result.message || 'Failed to create comment');
    }
    return { entryId, comment: result.comment };
  }
);

/**
 * Delete a comment
 */
export const deleteDiaryEntryComment = createAsyncThunk(
  'diarySocial/deleteComment',
  async ({ commentId, entryId, userId }: { commentId: string; entryId: string; userId: string }, { rejectWithValue }) => {
    const result = await diaryEntriesService.deleteDiaryEntryComment(commentId, userId);
    if (!result.success) {
      return rejectWithValue(result.message || 'Failed to delete comment');
    }
    return { commentId, entryId };
  }
);

const diarySocialSlice = createSlice({
  name: 'diarySocial',
  initialState,
  reducers: {
    // Clear comments for an entry (useful when navigating away)
    clearComments: (state, action: PayloadAction<string>) => {
      delete state.commentsByEntryId[action.payload];
    },
    // Clear like state for an entry
    clearLikeState: (state, action: PayloadAction<string>) => {
      delete state.likesByEntryId[action.payload];
    },
    // Update social info from entry data (when entry is loaded)
    updateSocialInfoFromEntry: (
      state,
      action: PayloadAction<{ entryId: string; likesCount?: number; commentsCount?: number; hasLiked?: boolean }>
    ) => {
      const { entryId, likesCount, commentsCount, hasLiked } = action.payload;
      
      if (likesCount !== undefined || hasLiked !== undefined) {
        const currentLikeState = state.likesByEntryId[entryId] || { hasLiked: false, likesCount: 0, loading: false };
        state.likesByEntryId[entryId] = {
          ...currentLikeState,
          likesCount: likesCount !== undefined ? likesCount : currentLikeState.likesCount,
          hasLiked: hasLiked !== undefined ? hasLiked : currentLikeState.hasLiked,
        };
      }
    },
  },
  extraReducers: (builder) => {
    // Load social info
    builder
      .addCase(loadDiaryEntrySocialInfo.pending, (state, action) => {
        const entryId = action.meta.arg.entryId;
        const currentLikeState = state.likesByEntryId[entryId];
        // Don't set loading to true if we're loading social info - this is just a data fetch
        // Only set loading if there's no existing state (initial load)
        if (!currentLikeState) {
          state.likesByEntryId[entryId] = { 
            hasLiked: false, 
            likesCount: 0, 
            loading: false 
          };
        }
      })
      .addCase(loadDiaryEntrySocialInfo.fulfilled, (state, action) => {
        const { entryId, likesCount, commentsCount, hasLiked } = action.payload;
        const currentLikeState = state.likesByEntryId[entryId];
        // Always update with fresh data from server, but preserve loading state if a like action is in progress
        // (loading: true means a like/unlike action is happening, not that we're fetching social info)
        const isLoadingLikeAction = currentLikeState?.loading === true;
        state.likesByEntryId[entryId] = {
          hasLiked,
          likesCount,
          loading: isLoadingLikeAction, // Keep loading true if like action is in progress, otherwise false
        };
      })
      .addCase(loadDiaryEntrySocialInfo.rejected, (state, action) => {
        const entryId = action.meta.arg.entryId;
        const currentLikeState = state.likesByEntryId[entryId] || { hasLiked: false, likesCount: 0, loading: false };
        state.likesByEntryId[entryId] = { ...currentLikeState, loading: false };
      });

    // Toggle like
    builder
      .addCase(toggleDiaryEntryLike.pending, (state, action) => {
        const entryId = action.meta.arg.entryId;
        const currentLikeState = state.likesByEntryId[entryId] || { hasLiked: false, likesCount: 0, loading: false };
        // Use the currentHasLiked from action if provided, otherwise use state
        const currentlyLiked = action.meta.arg.currentHasLiked !== undefined 
          ? action.meta.arg.currentHasLiked 
          : currentLikeState.hasLiked;
        // Optimistic update - flip the like state
        state.likesByEntryId[entryId] = {
          hasLiked: !currentlyLiked,
          likesCount: currentLikeState.likesCount + (currentlyLiked ? -1 : 1),
          loading: true,
        };
      })
      .addCase(toggleDiaryEntryLike.fulfilled, (state, action) => {
        const { entryId, hasLiked, likesCount } = action.payload;
        state.likesByEntryId[entryId] = {
          hasLiked,
          likesCount,
          loading: false,
        };
      })
      .addCase(toggleDiaryEntryLike.rejected, (state, action) => {
        const entryId = action.meta.arg.entryId;
        // Revert optimistic update
        const currentLikeState = state.likesByEntryId[entryId];
        if (currentLikeState) {
          // Revert: flip hasLiked back and adjust count
          const wasLikedBeforeToggle = !currentLikeState.hasLiked; // Current state is after toggle, so before was opposite
          state.likesByEntryId[entryId] = {
            hasLiked: wasLikedBeforeToggle,
            likesCount: currentLikeState.likesCount + (currentLikeState.hasLiked ? -1 : 1), // Revert count change
            loading: false,
          };
        }
      });

    // Load comments
    builder
      .addCase(loadDiaryEntryComments.pending, (state, action) => {
        const entryId = action.meta.arg.entryId;
        const reset = action.meta.arg.reset;
        const currentState = state.commentsByEntryId[entryId];
        state.commentsByEntryId[entryId] = {
          comments: reset ? [] : (currentState?.comments || []),
          loading: true,
          error: null,
          hasMore: currentState?.hasMore || false,
        };
      })
      .addCase(loadDiaryEntryComments.fulfilled, (state, action) => {
        const { entryId, comments, reset, hasMore } = action.payload;
        const currentState = state.commentsByEntryId[entryId] || { comments: [], loading: false, error: null, hasMore: false };
        state.commentsByEntryId[entryId] = {
          comments: reset ? comments : [...currentState.comments, ...comments],
          loading: false,
          error: null,
          hasMore,
        };
      })
      .addCase(loadDiaryEntryComments.rejected, (state, action) => {
        const entryId = action.meta.arg.entryId;
        state.commentsByEntryId[entryId] = {
          comments: state.commentsByEntryId[entryId]?.comments || [],
          loading: false,
          error: action.error.message || 'Failed to load comments',
          hasMore: state.commentsByEntryId[entryId]?.hasMore || false,
        };
      });

    // Create comment
    builder
      .addCase(createDiaryEntryComment.fulfilled, (state, action) => {
        const { entryId, comment } = action.payload;
        const currentState = state.commentsByEntryId[entryId] || { comments: [], loading: false, error: null, hasMore: false };
        state.commentsByEntryId[entryId] = {
          ...currentState,
          comments: [...currentState.comments, comment],
        };
        // Update like state comments count
        const likeState = state.likesByEntryId[entryId];
        if (likeState) {
          // Comments count is maintained by database trigger, but we can optimistically increment
          // We'll reload social info to get accurate count
        }
      })
      .addCase(createDiaryEntryComment.rejected, (state, action) => {
        const entryId = action.meta.arg.entryId;
        const currentState = state.commentsByEntryId[entryId];
        if (currentState) {
          currentState.error = action.error.message || 'Failed to create comment';
        }
      });

    // Delete comment
    builder
      .addCase(deleteDiaryEntryComment.fulfilled, (state, action) => {
        const { commentId, entryId } = action.payload;
        const currentState = state.commentsByEntryId[entryId];
        if (currentState) {
          currentState.comments = currentState.comments.filter(c => c.id !== commentId);
        }
      });
  },
});

export const {
  clearComments,
  clearLikeState,
  updateSocialInfoFromEntry,
} = diarySocialSlice.actions;

export default diarySocialSlice.reducer;

