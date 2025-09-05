import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, SerializedUser, Activity } from '../../types';

interface UserState {
  following: SerializedUser[];
  followers: SerializedUser[];
  activityFeed: Activity[];
  userProfile: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  following: [],
  followers: [],
  activityFeed: [],
  userProfile: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    fetchUserStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchUserSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.userProfile = action.payload;
    },
    fetchUserFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setFollowing: (state, action: PayloadAction<SerializedUser[]>) => {
      state.following = action.payload;
    },
    addFollowing: (state, action: PayloadAction<SerializedUser>) => {
      if (!state.following.find(user => user.id === action.payload.id)) {
        state.following.push(action.payload);
      }
    },
    removeFollowing: (state, action: PayloadAction<string>) => {
      state.following = state.following.filter(user => user.id !== action.payload);
    },
    setFollowers: (state, action: PayloadAction<SerializedUser[]>) => {
      state.followers = action.payload;
    },
    setActivityFeed: (state, action: PayloadAction<Activity[]>) => {
      state.activityFeed = action.payload;
    },
    addActivity: (state, action: PayloadAction<Activity>) => {
      state.activityFeed.unshift(action.payload);
      // Keep only the latest 50 activities
      state.activityFeed = state.activityFeed.slice(0, 50);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchUserStart,
  fetchUserSuccess,
  fetchUserFailure,
  setFollowing,
  addFollowing,
  removeFollowing,
  setFollowers,
  setActivityFeed,
  addActivity,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;