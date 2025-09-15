import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, SerializedUser } from '../../types';
import { AuthService } from '../../services/authService';
import { userService } from '../../services/userService';

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

// Async thunks for authentication
export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔍 [DEBUG] authSlice: signInWithGoogle thunk started');
      console.log('🔍 [DEBUG] authSlice: Calling AuthService.signInWithGoogle');
      const result = await AuthService.signInWithGoogle();
      console.log('🔍 [DEBUG] authSlice: AuthService.signInWithGoogle completed');
      if (result.user) {
        // Get the actual user profile from the database (real Supabase session now!)
        const profile = await userService.getCurrentUserProfile();
        if (profile) {
          // Convert to SerializedUser format for Redux
          const user: SerializedUser = {
            id: profile.id,
            username: profile.username,
            email: result.user.email || '',
            bio: profile.bio || '',
            profilePicture: profile.avatar_url || '',
            joinedDate: profile.created_at, // Already a string from database
            lastActiveDate: new Date().toISOString(),
            preferences: {
              favoriteGenres: [],
              favoriteAlbumIds: [],
              notifications: {
                newFollowers: true,
                reviewLikes: true,
                friendActivity: true,
              },
              privacy: {
                profileVisibility: profile.is_private ? 'private' as const : 'public' as const,
                activityVisibility: profile.is_private ? 'private' as const : 'public' as const,
              },
            },
          };
          console.log('Loaded real user profile for Redux:', user.username);
          return user;
        }
      }
      throw new Error('Failed to get user data from Google Sign-In');
    } catch (error: any) {
      console.log('🔍 [DEBUG] authSlice: signInWithGoogle failed with error:', error);
      console.log('🔍 [DEBUG] authSlice: Error message:', error.message);
      return rejectWithValue(error.message || 'Google Sign-In failed');
    }
  }
);

export const signInWithApple = createAsyncThunk(
  'auth/signInWithApple',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🍎 [DEBUG] authSlice: signInWithApple thunk started');
      
      // Check if Apple Sign-In is available
      console.log('🍎 [DEBUG] authSlice: Checking Apple Sign-In availability');
      const isAvailable = await AuthService.isAppleSignInAvailable();
      console.log('🍎 [DEBUG] authSlice: Apple Sign-In available:', isAvailable);
      if (!isAvailable) {
        throw new Error('Apple Sign-In is not available on this device');
      }

      console.log('🍎 [DEBUG] authSlice: Calling AuthService.signInWithApple');
      const result = await AuthService.signInWithApple();
      console.log('🍎 [DEBUG] authSlice: AuthService.signInWithApple completed');
      if (result.user) {
        // Get the actual user profile from the database
        const profile = await userService.getCurrentUserProfile();
        if (profile) {
          // Convert to SerializedUser format for Redux
          const user: SerializedUser = {
            id: profile.id,
            username: profile.username,
            email: result.user.email || '',
            bio: profile.bio || '',
            profilePicture: profile.avatar_url || '',
            joinedDate: profile.created_at, // Already a string from database
            lastActiveDate: new Date().toISOString(),
            preferences: {
              favoriteGenres: [],
              favoriteAlbumIds: [],
              notifications: {
                newFollowers: true,
                reviewLikes: true,
                friendActivity: true,
              },
              privacy: {
                profileVisibility: profile.is_private ? 'private' as const : 'public' as const,
                activityVisibility: profile.is_private ? 'private' as const : 'public' as const,
              },
            },
          };
          console.log('Loaded real user profile for Redux:', user.username);
          return user;
        }
      }
      throw new Error('Failed to get user data from Apple Sign-In');
    } catch (error: any) {
      console.log('🍎 [DEBUG] authSlice: signInWithApple failed with error:', error);
      console.log('🍎 [DEBUG] authSlice: Error message:', error.message);
      return rejectWithValue(error.message || 'Apple Sign-In failed');
    }
  }
);

export const signOutUser = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.signOut();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign out failed');
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const session = await AuthService.getCurrentSession();
      if (session?.user) {
        // Get the user profile from the database
        const profile = await userService.getCurrentUserProfile();
        if (profile) {
          // Convert to SerializedUser format for Redux (dates as strings)
          const user: SerializedUser = {
            id: profile.id,
            username: profile.username,
            email: session.user.email || '',
            bio: profile.bio || '',
            profilePicture: profile.avatar_url || '',
            joinedDate: profile.created_at, // Already a string from database
            lastActiveDate: new Date().toISOString(), // Convert to string for Redux
            preferences: {
              favoriteGenres: [],
              favoriteAlbumIds: [],
              notifications: {
                newFollowers: true,
                reviewLikes: true,
                friendActivity: true,
              },
              privacy: {
                profileVisibility: profile.is_private ? 'private' as const : 'public' as const,
                activityVisibility: profile.is_private ? 'private' as const : 'public' as const,
              },
            },
          };
          return user;
        }
      }
      return null; // No authenticated user
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to initialize auth');
    }
  }
);

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
      if (action.payload.joinedDate instanceof Date && action.payload.lastActiveDate instanceof Date) {
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
  extraReducers: (builder) => {
    builder
      // Google Sign-In
      .addCase(signInWithGoogle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        if (action.payload.joinedDate instanceof Date && action.payload.lastActiveDate instanceof Date) {
          const user = action.payload as User;
          state.user = {
            ...user,
            joinedDate: user.joinedDate.toISOString(),
            lastActiveDate: user.lastActiveDate.toISOString(),
          };
        } else {
          state.user = action.payload as SerializedUser;
        }
        state.error = null;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Apple Sign-In
      .addCase(signInWithApple.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signInWithApple.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        if (action.payload.joinedDate instanceof Date && action.payload.lastActiveDate instanceof Date) {
          const user = action.payload as User;
          state.user = {
            ...user,
            joinedDate: user.joinedDate.toISOString(),
            lastActiveDate: user.lastActiveDate.toISOString(),
          };
        } else {
          state.user = action.payload as SerializedUser;
        }
        state.error = null;
      })
      .addCase(signInWithApple.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Sign Out
      .addCase(signOutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(signOutUser.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Initialize Auth
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          if (action.payload.joinedDate instanceof Date && action.payload.lastActiveDate instanceof Date) {
            const user = action.payload as User;
            state.user = {
              ...user,
              joinedDate: user.joinedDate.toISOString(),
              lastActiveDate: user.lastActiveDate.toISOString(),
            };
          } else {
            state.user = action.payload as SerializedUser;
          }
        } else {
          state.isAuthenticated = false;
          state.user = null;
        }
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      });
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