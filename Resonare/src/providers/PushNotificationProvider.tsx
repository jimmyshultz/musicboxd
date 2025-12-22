import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { RootState } from '../store';
import { pushTokenService } from '../services/pushTokenService';

interface PushNotificationProviderProps {
    children: React.ReactNode;
}

/**
 * Provider that manages push notification token registration and message handling.
 * Registers FCM token when user logs in, deactivates on logout.
 * Also handles incoming push notifications while app is in foreground.
 */
export const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({ children }) => {
    const { user } = useSelector((state: RootState) => state.auth);
    const tokenRefreshUnsubscribeRef = useRef<(() => void) | null>(null);
    const foregroundUnsubscribeRef = useRef<(() => void) | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const previousUserIdRef = useRef<string | null>(null);

    // Handle logout - deactivate token when user changes from authenticated to null
    useEffect(() => {
        // If user was authenticated and is now null, deactivate token
        if (previousUserIdRef.current && !user?.id) {
            console.log('📱 Push: User logged out, deactivating token');
            pushTokenService.deactivateToken(previousUserIdRef.current);
        }

        // Update the previous user ID ref
        previousUserIdRef.current = user?.id ?? null;
    }, [user?.id]);

    // Set up push notification handlers when user authenticates
    useEffect(() => {
        if (!user?.id) {
            // User logged out - skip token registration
            console.log('📱 Push: User not authenticated, skipping token registration');
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
        tokenRefreshUnsubscribeRef.current = pushTokenService.setupTokenRefreshListener(user.id);

        // Set up foreground message handler
        foregroundUnsubscribeRef.current = messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
            console.log('📱 Push: Foreground message received:', remoteMessage);
            // Foreground notifications are shown automatically by iOS via AppDelegate config
            // The in-app notification system will also update via real-time subscription
        });

        // Handle notification opened app (when app is in background)
        messaging().onNotificationOpenedApp((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
            console.log('📱 Push: Notification opened app:', remoteMessage);
            // TODO: Handle deep linking based on notification data
            // For now, the app just opens to the default screen
        });

        // Check if app was opened from a notification (when app was killed)
        messaging()
            .getInitialNotification()
            .then((remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
                if (remoteMessage) {
                    console.log('📱 Push: App opened from notification:', remoteMessage);
                    // TODO: Handle deep linking based on notification data
                }
            });

        // Handle app state changes (re-register token when coming from background)
        const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('📱 Push: App came to foreground, verifying token');
                // Token should still be valid, but we could re-verify if needed
            }
            appStateRef.current = nextAppState;
        });

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

            appStateSubscription.remove();
        };
    }, [user?.id]);

    return <>{children}</>;
};
