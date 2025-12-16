import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import albumSlice from './slices/albumSlice';
import artistSlice from './slices/artistSlice';
import userSlice from './slices/userSlice';
import searchSlice from './slices/searchSlice';
import diarySlice from './slices/diarySlice';
import diarySocialSlice from './slices/diarySocialSlice';
import userAlbumsSlice from './slices/userAlbumsSlice';
import notificationSlice from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    albums: albumSlice,
    artist: artistSlice,
    user: userSlice,
    search: searchSlice,
    diary: diarySlice,
    diarySocial: diarySocialSlice,
    userAlbums: userAlbumsSlice,
    notifications: notificationSlice,
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