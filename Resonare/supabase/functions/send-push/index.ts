// Supabase Edge Function: send-push
// Triggered by database webhook when a notification is inserted
// Sends push notification via Firebase Cloud Messaging V1 API

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// FCM V1 API endpoint - project ID is extracted from service account
const FCM_V1_BASE_URL = 'https://fcm.googleapis.com/v1/projects';

// Notification type to message mapping
const NOTIFICATION_MESSAGES: Record<string, { title: string; bodyTemplate: string }> = {
    follow: {
        title: 'New Follower',
        bodyTemplate: '@{username} started following you',
    },
    follow_request: {
        title: 'Follow Request',
        bodyTemplate: '@{username} wants to follow you',
    },
    follow_request_accepted: {
        title: 'Request Accepted',
        bodyTemplate: '@{username} accepted your follow request',
    },
    diary_like: {
        title: 'New Like',
        bodyTemplate: '@{username} liked your diary entry',
    },
    diary_comment: {
        title: 'New Comment',
        bodyTemplate: '@{username} commented on your diary entry',
    },
};

// Preference key mapping for notification types
const TYPE_TO_PREFERENCE: Record<string, string> = {
    follow: 'follows_enabled',
    follow_request: 'follows_enabled',
    follow_request_accepted: 'follows_enabled',
    diary_like: 'likes_enabled',
    diary_comment: 'comments_enabled',
};

interface NotificationPayload {
    type: 'INSERT';
    table: string;
    record: {
        id: string;
        user_id: string;
        type: string;
        actor_id: string;
        reference_id?: string;
        read: boolean;
        created_at: string;
    };
    schema: string;
}

interface ServiceAccountCredentials {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
}

// Cache for access token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth2 access token for FCM V1 API using service account credentials
 */
async function getAccessToken(serviceAccount: ServiceAccountCredentials): Promise<string> {
    // Check if we have a valid cached token (with 5 min buffer)
    if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 300000) {
        return cachedAccessToken.token;
    }

    // Create JWT for OAuth2
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    const header = {
        alg: 'RS256',
        typ: 'JWT',
    };

    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: expiry,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
    };

    // Encode header and payload
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Sign with private key
    const privateKey = serviceAccount.private_key;
    const keyData = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\n/g, '');

    const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        encoder.encode(unsignedToken)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const jwt = `${unsignedToken}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Failed to get access token: ${error}`);
    }

    const tokenData = await tokenResponse.json();

    // Cache the token
    cachedAccessToken = {
        token: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };

    return tokenData.access_token;
}

serve(async (req: Request) => {
    try {
        // Get secrets from environment
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

        if (!serviceAccountJson) {
            console.error('FIREBASE_SERVICE_ACCOUNT not configured');
            return new Response(JSON.stringify({ error: 'Firebase not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Parse service account credentials
        let serviceAccount: ServiceAccountCredentials;
        try {
            serviceAccount = JSON.parse(serviceAccountJson);
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
            return new Response(JSON.stringify({ error: 'Invalid service account config' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Parse the webhook payload
        const payload: NotificationPayload = await req.json();
        console.log('Received notification webhook:', payload);

        // Only handle INSERT events on notifications table
        if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
            return new Response(JSON.stringify({ message: 'Ignored - not a notification insert' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const notification = payload.record;
        const notificationType = notification.type;

        // Get notification message template
        const messageTemplate = NOTIFICATION_MESSAGES[notificationType];
        if (!messageTemplate) {
            console.log('Unknown notification type:', notificationType);
            return new Response(JSON.stringify({ message: 'Unknown notification type' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create Supabase client with service role key (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user's push preferences
        const { data: preferences } = await supabase
            .from('push_preferences')
            .select('*')
            .eq('user_id', notification.user_id)
            .single();

        // Check if push notifications are enabled for this type
        if (preferences) {
            if (!preferences.push_enabled) {
                console.log('Push notifications disabled for user');
                return new Response(JSON.stringify({ message: 'Push disabled for user' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const preferenceKey = TYPE_TO_PREFERENCE[notificationType];
            if (preferenceKey && !preferences[preferenceKey]) {
                console.log(`${notificationType} notifications disabled for user`);
                return new Response(JSON.stringify({ message: 'Notification type disabled' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        // Get actor's profile for username
        const { data: actor } = await supabase
            .from('user_profiles')
            .select('username, display_name')
            .eq('id', notification.actor_id)
            .single();

        const actorUsername = actor?.username || 'Someone';

        // Get user's active FCM tokens
        const { data: tokens } = await supabase
            .from('push_tokens')
            .select('token, platform')
            .eq('user_id', notification.user_id)
            .eq('is_active', true);

        if (!tokens || tokens.length === 0) {
            console.log('No active push tokens for user');
            return new Response(JSON.stringify({ message: 'No active tokens' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get OAuth2 access token
        const accessToken = await getAccessToken(serviceAccount);

        // Get unread notification count for badge
        const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', notification.user_id)
            .eq('read', false);

        const badgeCount = unreadCount ?? 1;

        // Build notification message
        const title = messageTemplate.title;
        const body = messageTemplate.bodyTemplate.replace('{username}', actorUsername);

        // FCM V1 API endpoint
        const fcmUrl = `${FCM_V1_BASE_URL}/${serviceAccount.project_id}/messages:send`;

        // Send to each token
        const results = await Promise.allSettled(
            tokens.map(async (tokenRecord: { token: string; platform: string }) => {
                // Build FCM V1 message format
                const fcmMessage = {
                    message: {
                        token: tokenRecord.token,
                        notification: {
                            title,
                            body,
                        },
                        data: {
                            notification_id: notification.id,
                            notification_type: notificationType,
                            reference_id: notification.reference_id || '',
                            actor_id: notification.actor_id,
                        },
                        // iOS specific configuration
                        apns: {
                            payload: {
                                aps: {
                                    sound: 'default',
                                    badge: badgeCount,
                                    'mutable-content': 1,
                                },
                            },
                        },
                        // Android specific configuration
                        android: {
                            priority: 'high',
                            notification: {
                                sound: 'default',
                                channel_id: 'default',
                            },
                        },
                    },
                };

                // Send via FCM V1 API
                const response = await fetch(fcmUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(fcmMessage),
                });

                const result = await response.json();
                console.log('FCM V1 response for token:', result);

                // If token is invalid, mark it as inactive
                if (!response.ok && result.error) {
                    const errorCode = result.error.details?.[0]?.errorCode || result.error.code;
                    if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
                        console.log('Marking invalid token as inactive');
                        await supabase
                            .from('push_tokens')
                            .update({ is_active: false })
                            .eq('token', tokenRecord.token);
                    }
                }

                return { success: response.ok, result };
            })
        );

        console.log('Push notification results:', results);

        return new Response(
            JSON.stringify({
                success: true,
                sent_to: tokens.length,
                results: results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason })),
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Error processing push notification:', error);
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
