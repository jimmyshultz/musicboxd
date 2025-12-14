import React, { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { notificationService } from '../services/notificationService';
import { addNotification, setUnreadCount } from '../store/slices/notificationSlice';
import { AppNotification } from '../types';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Stabilize the notification handler callback with useCallback
  const handleNotification = useCallback((notification: any) => {
    try {
      console.log('🔔 Processing real-time notification callback:', notification);
      // Transform database notification to AppNotification
      const appNotification: AppNotification = {
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        actorId: notification.actor_id,
        actorUsername: notification.actor?.username,
        actorAvatar: notification.actor?.avatar_url,
        referenceId: notification.reference_id,
        read: notification.read,
        createdAt: notification.created_at,
      };

      console.log('🔔 Dispatching addNotification:', {
        id: appNotification.id,
        type: appNotification.type,
        read: appNotification.read,
        willIncrementCount: !appNotification.read,
      });
      dispatch(addNotification(appNotification));
      console.log('🔔 addNotification dispatched');
    } catch (error) {
      console.error('❌ Error processing real-time notification:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!user?.id) {
      // User not authenticated, unsubscribe from all notifications
      console.log('🔔 No user ID, unsubscribing from all notifications');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      notificationService.unsubscribeAll();
      return;
    }

    // Ensure notificationService is available
    if (!notificationService) {
      console.error('❌ notificationService not available - module may not be loaded');
      return;
    }

    // Setup subscription after service is ready
    const setupSubscription = async () => {
      try {
        // Wait for service to be ready (with timeout)
        const startTime = Date.now();
        await notificationService.waitForReady(10000); // 10 second timeout
        const waitTime = Date.now() - startTime;
        
        if (waitTime > 1000) {
          console.warn(`⚠️ Notification service took ${waitTime}ms to become ready`);
        } else {
          console.log(`✅ Notification service ready in ${waitTime}ms`);
        }

        // Fetch initial unread count
        try {
          const count = await notificationService.getUnreadCount(user.id);
          dispatch(setUnreadCount(count));
        } catch (error) {
          console.error('Error fetching unread notification count:', error);
        }

        // Subscribe to real-time notifications
        console.log('🔔 Setting up real-time subscription for user:', user.id);
        console.log('🔔 notificationService ready:', notificationService.isServiceReady());
        
        const unsubscribeFn = notificationService.subscribeToNotifications(
          user.id,
          handleNotification
        );
        unsubscribeRef.current = unsubscribeFn;
        console.log('🔔 Subscription setup complete, unsubscribe function:', !!unsubscribeFn);
      } catch (error) {
        console.error('❌ Error setting up notification subscription:', error);
        // Log warning but don't block - service might still work
        if (error instanceof Error && error.message.includes('timeout')) {
          console.warn('⚠️ Service initialization timeout - subscription may not work until service is ready');
        }
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount or user change
    return () => {
      console.log('🔔 Cleaning up notification subscription for user:', user.id);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Removed dispatch - it's stable from Redux Toolkit

  return <>{children}</>;
};
