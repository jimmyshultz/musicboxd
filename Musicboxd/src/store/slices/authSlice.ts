import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, SerializedUser } from '../../types';

interface AuthState {
  user: SerializedUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<User | SerializedUser>) => {
      state.loading = false;
      state.isAuthenticated = true;
      // Convert Date objects to strings to avoid Redux serialization issues
      if (action.payload.joinedDate instanceof Date) {
        const user = action.payload as User;
        state.user = {
          ...user,
          joinedDate: user.joinedDate.toISOString(),
          lastActiveDate: user.lastActiveDate.toISOString(),
        };
      } else {
        // Already serialized
        state.user = action.payload as SerializedUser;
      }
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        // Convert any Date objects to strings to avoid Redux serialization issues
        const updates: Partial<SerializedUser> = {};
        
        // Copy all non-Date properties
        Object.keys(action.payload).forEach(key => {
          const value = action.payload[key as keyof User];
          if (key === 'joinedDate' && value instanceof Date) {
            updates.joinedDate = value.toISOString();
          } else if (key === 'lastActiveDate' && value instanceof Date) {
            updates.lastActiveDate = value.toISOString();
          } else if (key !== 'joinedDate' && key !== 'lastActiveDate') {
            (updates as any)[key] = value;
          }
        });
        
        state.user = { ...state.user, ...updates };
      }
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  updateProfile,
} = authSlice.actions;

export default authSlice.reducer;