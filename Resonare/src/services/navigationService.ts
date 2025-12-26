import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

/**
 * Navigation reference that can be used outside of React components
 * This is used for deep linking from push notifications
 */
export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen from anywhere in the app
 * @param name - Screen name
 * @param params - Screen parameters
 */
export function navigate(name: string, params?: Record<string, any>) {
    if (navigationRef.isReady()) {
        navigationRef.dispatch(
            CommonActions.navigate({
                name,
                params,
            })
        );
    } else {
        console.warn('Navigation ref not ready, queuing navigation:', name);
        // Queue navigation for when ref becomes ready
        setTimeout(() => {
            if (navigationRef.isReady()) {
                navigationRef.dispatch(
                    CommonActions.navigate({
                        name,
                        params,
                    })
                );
            }
        }, 500);
    }
}

/**
 * Handle navigation for push notification data
 * Routes to the appropriate screen based on notification type
 */
export function handlePushNotificationNavigation(data: {
    notification_type?: string;
    reference_id?: string;
    notification_id?: string;
    actor_id?: string;
    user_id?: string;
}) {
    const { notification_type, reference_id, actor_id, user_id } = data;

    console.log('📱 Deep linking for notification type:', notification_type);

    if (!notification_type) {
        console.log('📱 No notification type, navigating to notifications screen');
        navigate('Notifications');
        return;
    }

    switch (notification_type) {
        case 'follow':
        case 'follow_request_accepted':
            // Navigate to the actor's profile (the new follower or person who accepted)
            if (actor_id) {
                console.log('📱 Navigating to user profile:', actor_id);
                navigate('UserProfile', { userId: actor_id });
            } else {
                navigate('Notifications');
            }
            break;

        case 'follow_request':
            // Navigate to follow requests screen (nested in Profile tab)
            console.log('📱 Navigating to follow requests');
            navigate('Profile', {
                screen: 'FollowRequests',
            });
            break;

        case 'diary_like':
        case 'diary_comment':
            // Navigate to the diary entry
            if (reference_id && user_id) {
                console.log('📱 Navigating to diary entry:', reference_id, 'userId:', user_id);
                // reference_id is the diary entry ID
                // user_id is the owner of the diary entry (the current user who received the notification)
                navigate('DiaryEntryDetails', {
                    entryId: reference_id,
                    userId: user_id,
                });
            } else {
                console.log('📱 Missing reference_id or user_id, navigating to notifications');
                navigate('Notifications');
            }
            break;

        default:
            console.log('📱 Unknown notification type, navigating to notifications');
            navigate('Notifications');
            break;
    }
}
