import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import albumSlice from './slices/albumSlice';
import userSlice from './slices/userSlice';
import searchSlice from './slices/searchSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    albums: albumSlice,
    user: userSlice,
    search: searchSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;