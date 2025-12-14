import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppNotification } from '../../types';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    fetchNotificationsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchNotificationsSuccess: (state, action: PayloadAction<AppNotification[]>) => {
      state.loading = false;
      state.notifications = action.payload;
      // Recalculate unread count based on fetched notifications
      state.unreadCount = action.payload.filter(n => !n.read).length;
    },
    fetchNotificationsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addNotification: (state, action: PayloadAction<AppNotification>) => {
      console.log('🔔 addNotification reducer called:', {
        notificationId: action.payload.id,
        isUnread: !action.payload.read,
        currentUnreadCount: state.unreadCount,
      });
      
      // Check if notification already exists to avoid duplicates
      const existingIndex = state.notifications.findIndex(n => n.id === action.payload.id);
      
      if (existingIndex >= 0) {
        console.log('🔔 Notification already exists, updating');
        // Update existing notification
        state.notifications[existingIndex] = action.payload;
        // Recalculate unread count
        const newUnreadCount = state.notifications.filter(n => !n.read).length;
        console.log('🔔 Updated unread count:', newUnreadCount);
        state.unreadCount = newUnreadCount;
      } else {
        console.log('🔔 Adding new notification');
        // Add to beginning of array (most recent first)
        state.notifications.unshift(action.payload);
        // Keep only the latest 100 notifications
        if (state.notifications.length > 100) {
          state.notifications = state.notifications.slice(0, 100);
        }
        // Increment unread count if notification is unread
        if (!action.payload.read) {
          const newUnreadCount = state.unreadCount + 1;
          console.log('🔔 Incrementing unread count from', state.unreadCount, 'to', newUnreadCount);
          state.unreadCount = newUnreadCount;
        } else {
          console.log('🔔 Notification is read, not incrementing count');
        }
      }
      console.log('🔔 Final unread count:', state.unreadCount);
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        // Decrement unread count if notification was unread
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        // Remove from array
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
      }
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchNotificationsStart,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  setUnreadCount,
  incrementUnreadCount,
  clearError,
} = notificationSlice.actions;

export default notificationSlice.reducer;
