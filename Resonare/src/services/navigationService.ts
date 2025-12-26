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
 * 
 * Note: Screens are nested within tab navigators, so we must provide the full path:
 * Root -> Main (tab navigator) -> Tab (stack navigator) -> Screen
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
        // Navigate to Notifications screen within Home tab
        navigate('Main', {
            screen: 'Home',
            params: {
                screen: 'Notifications',
            },
        });
        return;
    }

    switch (notification_type) {
        case 'follow':
        case 'follow_request_accepted':
            // Navigate to the actor's profile (the new follower or person who accepted)
            if (actor_id) {
                console.log('📱 Navigating to user profile:', actor_id);
                // Navigate to UserProfile within Home tab
                navigate('Main', {
                    screen: 'Home',
                    params: {
                        screen: 'UserProfile',
                        params: { userId: actor_id },
                    },
                });
            } else {
                // Fallback to notifications screen
                navigate('Main', {
                    screen: 'Home',
                    params: {
                        screen: 'Notifications',
                    },
                });
            }
            break;

        case 'follow_request':
            // Navigate to follow requests screen (nested in Profile tab)
            console.log('📱 Navigating to follow requests');
            navigate('Main', {
                screen: 'Profile',
                params: {
                    screen: 'FollowRequests',
                },
            });
            break;

        case 'diary_like':
        case 'diary_comment':
            // Navigate to the diary entry
            if (reference_id && user_id) {
                console.log('📱 Navigating to diary entry:', reference_id, 'userId:', user_id);
                // Navigate to DiaryEntryDetails within Home tab
                // reference_id is the diary entry ID
                // user_id is the owner of the diary entry (the current user who received the notification)
                navigate('Main', {
                    screen: 'Home',
                    params: {
                        screen: 'DiaryEntryDetails',
                        params: {
                            entryId: reference_id,
                            userId: user_id,
                        },
                    },
                });
            } else {
                console.log('📱 Missing reference_id or user_id, navigating to notifications');
                navigate('Main', {
                    screen: 'Home',
                    params: {
                        screen: 'Notifications',
                    },
                });
            }
            break;

        default:
            console.log('📱 Unknown notification type, navigating to notifications');
            navigate('Main', {
                screen: 'Home',
                params: {
                    screen: 'Notifications',
                },
            });
            break;
    }
}
