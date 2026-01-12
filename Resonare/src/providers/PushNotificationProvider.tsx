import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { RootState } from '../store';
import { pushTokenService } from '../services/pushTokenService';
import { handlePushNotificationNavigation } from '../services/navigationService';

interface PushNotificationProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that manages push notification token registration and message handling.
 * Registers FCM token when user logs in, deactivates on logout.
 * Also handles incoming push notifications while app is in foreground.
 */
export const PushNotificationProvider: React.FC<
  PushNotificationProviderProps
> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const tokenRefreshUnsubscribeRef = useRef<(() => void) | null>(null);
  const foregroundUnsubscribeRef = useRef<(() => void) | null>(null);
  const notificationOpenedUnsubscribeRef = useRef<(() => void) | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const previousUserIdRef = useRef<string | null>(null);

  // Handle logout - deactivate token when user changes from authenticated to null
  useEffect(() => {
    // If user was authenticated and is now null, deactivate token
    if (previousUserIdRef.current && !user?.id) {
      console.log(
        '📱 Push: User logged out, deactivating token for this device',
      );
      // Deactivate only this device's token to preserve other devices
      pushTokenService
        .deactivateToken(previousUserIdRef.current)
        .catch(error => {
          console.error('📱 Push: Error during token deactivation:', error);
        });
    }

    // Update the previous user ID ref
    previousUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  // Set up push notification handlers when user authenticates
  useEffect(() => {
    if (!user?.id) {
      // User logged out - skip token registration
      console.log(
        '📱 Push: User not authenticated, skipping token registration',
      );
      return;
    }

    console.log('📱 Push: User authenticated, registering FCM token');

    // Register the token
    const registerToken = async () => {
      try {
        await pushTokenService.registerToken(user.id);
      } catch (error) {
        console.error('📱 Push: Error registering token:', error);
      }
    };

    registerToken();

    // Set up token refresh listener
    tokenRefreshUnsubscribeRef.current =
      pushTokenService.setupTokenRefreshListener(user.id);

    // Set up foreground message handler
    foregroundUnsubscribeRef.current = messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('📱 Push: Foreground message received:', remoteMessage);
        // Foreground notifications are shown automatically by iOS via AppDelegate config
        // The in-app notification system will also update via real-time subscription
      },
    );

    // Handle notification opened app (when app is in background)
    notificationOpenedUnsubscribeRef.current =
      messaging().onNotificationOpenedApp(
        (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
          console.log('📱 Push: Notification opened app:', remoteMessage);
          if (remoteMessage.data) {
            handlePushNotificationNavigation(
              remoteMessage.data as {
                notification_type?: string;
                reference_id?: string;
                notification_id?: string;
                actor_id?: string;
                user_id?: string;
              },
            );
          }
        },
      );

    // Check if app was opened from a notification (when app was killed)
    messaging()
      .getInitialNotification()
      .then((remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
        if (remoteMessage) {
          console.log('📱 Push: App opened from notification:', remoteMessage);
          if (remoteMessage.data) {
            // Small delay to ensure navigation is ready
            setTimeout(() => {
              handlePushNotificationNavigation(
                remoteMessage.data as {
                  notification_type?: string;
                  reference_id?: string;
                  notification_id?: string;
                  actor_id?: string;
                  user_id?: string;
                },
              );
            }, 1000);
          }
        }
      });

    // Note: Badge clearing is handled natively in AppDelegate.swift
    // Track app state for potential future use
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          console.log('📱 Push: App came to foreground');
        }
        appStateRef.current = nextAppState;
      },
    );

    // Cleanup on unmount or user change
    return () => {
      console.log('📱 Push: Cleaning up push notification handlers');

      if (tokenRefreshUnsubscribeRef.current) {
        tokenRefreshUnsubscribeRef.current();
        tokenRefreshUnsubscribeRef.current = null;
      }

      if (foregroundUnsubscribeRef.current) {
        foregroundUnsubscribeRef.current();
        foregroundUnsubscribeRef.current = null;
      }

      if (notificationOpenedUnsubscribeRef.current) {
        notificationOpenedUnsubscribeRef.current();
        notificationOpenedUnsubscribeRef.current = null;
      }

      appStateSubscription.remove();
    };
  }, [user?.id]);

  return <>{children}</>;
};
