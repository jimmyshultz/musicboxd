import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DiaryEntry } from '../../types';

interface UserDiaryState {
  entries: DiaryEntry[];
  lastMonth?: string; // YYYY-MM of the last loaded month batch
  hasMore: boolean;
}

interface DiaryState {
  byUserId: Record<string, UserDiaryState>;
  loading: boolean;
  error: string | null;
}

const initialState: DiaryState = {
  byUserId: {},
  loading: false,
  error: null,
};

const diarySlice = createSlice({
  name: 'diary',
  initialState,
  reducers: {
    fetchDiaryStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDiarySuccess: (
      state,
      action: PayloadAction<{ userId: string; entries: DiaryEntry[]; lastMonth?: string; hasMore: boolean; reset?: boolean }>
    ) => {
      const { userId, entries, lastMonth, hasMore, reset } = action.payload;
      const prev = state.byUserId[userId] || { entries: [], hasMore: true };
      state.byUserId[userId] = {
        entries: reset ? entries : [...prev.entries, ...entries],
        lastMonth,
        hasMore,
      };
      state.loading = false;
    },
    fetchDiaryFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    upsertDiaryEntry: (state, action: PayloadAction<DiaryEntry>) => {
      const entry = action.payload;
      const userState = state.byUserId[entry.userId] || { entries: [], hasMore: true };
      const idx = userState.entries.findIndex(e => e.id === entry.id);
      if (idx === -1) {
        userState.entries.unshift(entry);
      } else {
        userState.entries[idx] = entry;
      }
      state.byUserId[entry.userId] = userState;
    },
    removeDiaryEntry: (state, action: PayloadAction<{ userId: string; entryId: string }>) => {
      const { userId, entryId } = action.payload;
      const userState = state.byUserId[userId];
      if (!userState) return;
      userState.entries = userState.entries.filter(e => e.id !== entryId);
    },
  },
});

export const {
  fetchDiaryStart,
  fetchDiarySuccess,
  fetchDiaryFailure,
  upsertDiaryEntry,
  removeDiaryEntry,
} = diarySlice.actions;

export default diarySlice.reducer;