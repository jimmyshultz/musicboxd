import { supabase } from './supabase';
import { Notification } from '../types/database';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Service for managing user notifications
 * Handles fetching, marking as read, and real-time subscriptions
 */
interface SubscriptionInfo {
  channel: RealtimeChannel;
  callback: (notification: Notification) => void;
  retryCount: number;
  retryTimer: NodeJS.Timeout | null;
  isRetrying: boolean;
}

class NotificationService {
  private client = supabase;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private subscriptionInfo: Map<string, SubscriptionInfo> = new Map();
  private isReady = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 30000; // 30 seconds

  /**
   * Initialize the notification service
   * Verifies Supabase client is ready and tests real-time connection
   * Should be called once when the app starts
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isReady) {
      return;
    }

    // If initialization is in progress, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  /**
   * Internal initialization logic
   */
  private async _doInitialize(): Promise<void> {
    try {
      console.log('🔔 Initializing notification service...');

      // Verify Supabase client is available
      if (!this.client) {
        throw new Error('Supabase client is not available');
      }

      // Mark as ready immediately - don't block startup
      this.isReady = true;
      console.log('✅ Notification service marked as ready');

      // Test connection in background (non-blocking)
      this.testRealtimeConnection().catch(error => {
        console.warn('⚠️ Background real-time connection test failed:', error);
        // Connection issues will be handled by retry logic in actual subscriptions
      });

      console.log('✅ Notification service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      // Reset promise so we can retry
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Test real-time connection in background (non-blocking)
   * Used to verify connection works, but doesn't block initialization
   */
  private async testRealtimeConnection(): Promise<void> {
    try {
      // Verify session first
      const { data: sessionData, error: sessionError } =
        await this.client.auth.getSession();
      if (sessionError) {
        console.warn('⚠️ Could not verify Supabase session:', sessionError);
      } else {
        console.log('✅ Supabase session verified:', !!sessionData.session);
      }

      // Test real-time connection by creating a temporary test channel
      const testChannelName = `test:${Date.now()}`;
      const testChannel = this.client.channel(testChannelName);

      return new Promise<void>((resolve, _reject) => {
        const timeout = setTimeout(() => {
          testChannel.unsubscribe();
          this.client.removeChannel(testChannel);
          console.log('⏳ Real-time connection test timed out (non-blocking)');
          resolve(); // Resolve, not reject - timeout is acceptable
        }, 2000);

        testChannel.subscribe(status => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            testChannel.unsubscribe();
            this.client.removeChannel(testChannel);
            console.log('✅ Real-time connection test successful');
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            testChannel.unsubscribe();
            this.client.removeChannel(testChannel);
            console.warn(`⚠️ Real-time connection test returned ${status}`);
            resolve(); // Resolve, not reject - errors are handled by retry logic
          }
        });
      });
    } catch (error) {
      console.warn('⚠️ Error during background connection test:', error);
      throw error;
    }
  }

  /**
   * Check if the service is ready
   * @returns true if the service has been initialized
   */
  isServiceReady(): boolean {
    return this.isReady;
  }

  /**
   * Wait for the service to be ready
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 10000)
   * @returns Promise that resolves when ready, or rejects on timeout
   */
  async waitForReady(timeoutMs: number = 10000): Promise<void> {
    if (this.isReady) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return Promise.race([
        this.initializationPromise,
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error('Service initialization timeout')),
            timeoutMs,
          ),
        ),
      ]);
    }

    // If not initialized, start initialization
    return this.initialize();
  }

  /**
   * Get notifications for a user
   * @param userId - The user ID to fetch notifications for
   * @param limit - Maximum number of notifications to return (default: 50)
   * @param offset - Number of notifications to skip (default: 0)
   * @returns Array of notifications with actor profile data
   */
  async getNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Notification[]> {
    const { data, error } = await this.client
      .from('notifications')
      .select(
        `
        *,
        actor:user_profiles!notifications_actor_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform the data to match Notification interface
    return (data || []).map((notification: any) => ({
      ...notification,
      actor: notification.actor
        ? {
            id: notification.actor.id,
            username: notification.actor.username,
            display_name: notification.actor.display_name,
            avatar_url: notification.actor.avatar_url,
          }
        : undefined,
    }));
  }

  /**
   * Get unread notification count for a user
   * @param userId - The user ID to get count for
   * @returns Number of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Mark a notification as read
   * @param notificationId - The notification ID to mark as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await (this.client.from('notifications') as any)
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Mark all notifications as read for a user
   * @param userId - The user ID to mark all notifications as read for
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await (this.client.from('notifications') as any)
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  }

  /**
   * Delete a notification
   * @param notificationId - The notification ID to delete
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Delete all notifications for a user
   * @param userId - The user ID to delete all notifications for
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Calculate exponential backoff delay
   * @param retryCount - Current retry attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(retryCount: number): number {
    const delay = Math.min(
      this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
      this.MAX_RETRY_DELAY,
    );
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
    return Math.floor(delay + jitter);
  }

  /**
   * Retry subscription with exponential backoff
   * @param userId - The user ID to resubscribe for
   * @param callback - Callback function
   * @param retryCount - Current retry attempt
   */
  private retrySubscription(
    userId: string,
    callback: (notification: Notification) => void,
    retryCount: number,
  ): void {
    const subscriptionInfo = this.subscriptionInfo.get(userId);
    if (!subscriptionInfo) {
      console.log(
        '📡 No subscription info found for retry, creating new subscription',
      );
      this._createSubscription(userId, callback, 0);
      return;
    }

    // Check if channel is already successfully subscribed before retrying
    const channel = this.subscriptions.get(userId);
    if (channel) {
      const channelState = channel.state as string;
      if (
        channelState === 'joined' ||
        String(channelState).includes('SUBSCRIBED')
      ) {
        console.log(
          '✅ Channel is already successfully subscribed, cancelling retry for user:',
          userId,
        );
        // Clear any pending retry timers
        if (subscriptionInfo.retryTimer) {
          clearTimeout(subscriptionInfo.retryTimer);
          subscriptionInfo.retryTimer = null;
        }
        subscriptionInfo.isRetrying = false;
        subscriptionInfo.retryCount = 0;
        return;
      }
    }

    if (subscriptionInfo.isRetrying) {
      console.log('📡 Retry already in progress for user:', userId);
      return;
    }

    if (retryCount >= this.MAX_RETRY_ATTEMPTS) {
      console.warn(
        '⚠️ Max retry attempts reached for user:',
        userId,
        '- giving up',
      );
      subscriptionInfo.isRetrying = false;
      return;
    }

    subscriptionInfo.isRetrying = true;
    subscriptionInfo.retryCount = retryCount;

    const delay = this.calculateBackoffDelay(retryCount);
    console.log(
      `🔄 Scheduling retry ${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS} for user ${userId} in ${delay}ms`,
    );

    subscriptionInfo.retryTimer = setTimeout(() => {
      // Double-check channel is still not healthy before retrying
      const currentChannel = this.subscriptions.get(userId);
      const currentInfo = this.subscriptionInfo.get(userId);

      if (currentChannel && currentInfo) {
        const currentState = currentChannel.state as string;
        if (
          currentState === 'joined' ||
          String(currentState).includes('SUBSCRIBED')
        ) {
          console.log(
            '✅ Channel became healthy before retry timer fired, cancelling retry for user:',
            userId,
          );
          currentInfo.isRetrying = false;
          currentInfo.retryCount = 0;
          currentInfo.retryTimer = null;
          return;
        }
      }

      console.log(
        `🔄 Retrying subscription for user: ${userId} (attempt ${retryCount + 1})`,
      );
      // Clean up old channel but preserve subscription info
      this.cleanupChannel(userId);
      // Create new subscription (subscriptionInfo is preserved, will be updated by _createSubscription)
      this._createSubscription(userId, callback, retryCount + 1);
    }, delay);
  }

  /**
   * Internal method to create a subscription
   * @param userId - The user ID to subscribe for
   * @param callback - Callback function
   * @param retryCount - Current retry attempt (0 for initial, >0 for retries)
   */
  private _createSubscription(
    userId: string,
    callback: (notification: Notification) => void,
    retryCount: number = 0,
  ): void {
    // Clean up any existing channel first (shouldn't exist, but be safe)
    this.cleanupChannel(userId);

    // Create a unique channel name for this user
    const channelName = `notifications:${userId}`;
    if (retryCount > 0) {
      console.log(
        `📡 Creating real-time channel (retry ${retryCount}):`,
        channelName,
      );
    } else {
      console.log('📡 Creating real-time channel:', channelName);
    }
    console.log('📡 User ID for filter:', userId);
    console.log('📡 Filter string:', `user_id=eq.${userId}`);

    // Store channel immediately so we can track it
    const channel = this.client
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      // DEBUG: Add a listener without filter to see if ANY events come through
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async payload => {
          console.log('🔍 [DEBUG] Received notification event (NO FILTER):', {
            id: payload.new?.id,
            user_id: payload.new?.user_id,
            target_user_id: userId,
            matches: payload.new?.user_id === userId,
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async payload => {
          try {
            console.log('🔔 Real-time notification received:', payload);
            console.log('🔔 Payload new data:', payload.new);
            console.log('🔔 Payload event type:', payload.eventType);
            console.log('🔔 Payload table:', payload.table);
            console.log('🔔 Payload schema:', payload.schema);

            // Try to fetch the full notification with actor data
            // If RLS blocks it, we'll use the payload data directly
            const { data, error } = await (
              this.client.from('notifications') as any
            )
              .select(
                `
                *,
                actor:user_profiles!notifications_actor_id_fkey (
                  id,
                  username,
                  display_name,
                  avatar_url
                )
              `,
              )
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('❌ Error fetching notification details:', error);
              // Fallback: use payload data directly if fetch fails
              // We'll need to fetch actor separately
              try {
                const { data: actorData } = await this.client
                  .from('user_profiles')
                  .select('id, username, display_name, avatar_url')
                  .eq('id', payload.new.actor_id)
                  .single();

                const notification: Notification = {
                  id: payload.new.id as string,
                  user_id: payload.new.user_id as string,
                  type: payload.new.type as
                    | 'follow'
                    | 'follow_request'
                    | 'follow_request_accepted',
                  actor_id: payload.new.actor_id as string,
                  reference_id: payload.new.reference_id as string | undefined,
                  read: payload.new.read as boolean,
                  created_at: payload.new.created_at as string,
                  actor: actorData
                    ? {
                        id: (actorData as any).id,
                        username: (actorData as any).username,
                        display_name: (actorData as any).display_name,
                        avatar_url: (actorData as any).avatar_url,
                        is_private: false,
                        created_at: '',
                        updated_at: '',
                      }
                    : undefined,
                };
                console.log(
                  '🔔 Calling callback with fallback notification data',
                );
                callback(notification);
                return;
              } catch (actorError) {
                console.error('❌ Error fetching actor data:', actorError);
                // Still call callback with minimal data
                const notification: Notification = {
                  id: payload.new.id as string,
                  user_id: payload.new.user_id as string,
                  type: payload.new.type as
                    | 'follow'
                    | 'follow_request'
                    | 'follow_request_accepted'
                    | 'diary_like'
                    | 'diary_comment',
                  actor_id: payload.new.actor_id as string,
                  reference_id: payload.new.reference_id as string | undefined,
                  read: payload.new.read as boolean,
                  created_at: payload.new.created_at as string,
                };
                console.log(
                  '🔔 Calling callback with minimal notification data',
                );
                callback(notification);
                return;
              }
            }

            if (data) {
              const notificationData = data as any;
              const notification: Notification = {
                id: notificationData.id,
                user_id: notificationData.user_id,
                type: notificationData.type as
                  | 'follow'
                  | 'follow_request'
                  | 'follow_request_accepted'
                  | 'diary_like'
                  | 'diary_comment',
                actor_id: notificationData.actor_id,
                reference_id: notificationData.reference_id,
                read: notificationData.read,
                created_at: notificationData.created_at,
                actor: notificationData.actor
                  ? {
                      id: notificationData.actor.id,
                      username: notificationData.actor.username,
                      display_name: notificationData.actor.display_name,
                      avatar_url: notificationData.actor.avatar_url,
                      is_private: false,
                      created_at: '',
                      updated_at: '',
                    }
                  : undefined,
              };
              console.log('🔔 Calling callback with full notification data');
              callback(notification);
            } else {
              console.warn('⚠️ No notification data returned from query');
            }
          } catch (error) {
            console.error(
              '❌ Unexpected error in real-time notification handler:',
              error,
            );
          }
        },
      )
      .subscribe((status, err) => {
        console.log('📡 Notification subscription status:', status);
        if (err) {
          console.error('📡 Subscription error details:', err);
        }

        if (status === 'SUBSCRIBED') {
          console.log(
            '✅ Successfully subscribed to notifications for user:',
            userId,
          );
          console.log(
            '✅ Channel is active and listening for INSERT events on notifications table',
          );

          // Reset retry state on successful subscription - clear ALL retry timers
          const subscriptionInfo = this.subscriptionInfo.get(userId);
          if (subscriptionInfo) {
            subscriptionInfo.isRetrying = false;
            subscriptionInfo.retryCount = 0;
            // Clear any pending retry timer
            if (subscriptionInfo.retryTimer) {
              clearTimeout(subscriptionInfo.retryTimer);
              subscriptionInfo.retryTimer = null;
            }
          }

          // Ensure channel is in map (it should already be there, but double-check)
          if (!this.subscriptions.has(userId)) {
            this.subscriptions.set(userId, channel);
            console.log('✅ Channel added to subscriptions map');
          } else {
            console.log('✅ Channel already in subscriptions map');
          }

          // Log channel details for debugging
          console.log(
            '✅ Active subscriptions count:',
            this.subscriptions.size,
          );
          console.log('✅ Channel topic:', channel.topic);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log(
            '⚠️ Channel error or timeout - will attempt automatic reconnection',
          );
          // Only trigger retry if not already retrying
          const subscriptionInfo = this.subscriptionInfo.get(userId);
          if (!subscriptionInfo?.isRetrying) {
            this.retrySubscription(userId, callback, retryCount);
          } else {
            console.log('📡 Retry already in progress, ignoring error status');
          }
        } else if (status === 'CLOSED') {
          // Only trigger retry if not already retrying and channel is actually closed (not just transitioning)
          const subscriptionInfo = this.subscriptionInfo.get(userId);
          if (!subscriptionInfo?.isRetrying) {
            // Check if channel is actually closed or if it's just a transition state
            const currentChannel = this.subscriptions.get(userId);
            if (currentChannel) {
              const currentState = currentChannel.state as string;
              // If channel is already healthy, don't retry
              if (
                currentState === 'joined' ||
                String(currentState).includes('SUBSCRIBED')
              ) {
                console.log(
                  '✅ Channel is healthy despite CLOSED status, not retrying',
                );
                return;
              }
            }
            console.log(
              '⚠️ Subscription closed - will attempt automatic reconnection',
            );
            this.retrySubscription(userId, callback, retryCount);
          } else {
            console.log('📡 Retry already in progress, ignoring CLOSED status');
          }
        } else {
          console.log(
            '⏳ Subscription status:',
            status,
            'Channel state:',
            channel.state,
          );
        }
      });

    // Store channel and subscription info immediately (before subscription completes)
    this.subscriptions.set(userId, channel);

    // Store subscription info for retry logic
    const subscriptionInfo: SubscriptionInfo = {
      channel,
      callback,
      retryCount,
      retryTimer: null,
      isRetrying: false,
    };
    this.subscriptionInfo.set(userId, subscriptionInfo);

    console.log('📡 Channel stored in subscriptions map (pre-subscribe)');
  }

  /**
   * Subscribe to real-time notifications for a user
   * @param userId - The user ID to subscribe for
   * @param callback - Callback function called when a new notification is created
   * @returns Unsubscribe function
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void,
  ): () => void {
    // Check if subscription already exists for this user
    const existingChannel = this.subscriptions.get(userId);
    const existingInfo = this.subscriptionInfo.get(userId);

    if (existingChannel && existingInfo) {
      // Verify the channel is still active
      const channelState = existingChannel.state as string;
      console.log(
        '📡 Existing subscription found for user:',
        userId,
        'State:',
        channelState,
      );
      // Check if channel is in a subscribed/active state
      if (
        channelState === 'joined' ||
        String(channelState).includes('SUBSCRIBED') ||
        String(channelState).includes('joined')
      ) {
        console.log('📡 Using existing active subscription');
        // Update callback in case it changed
        existingInfo.callback = callback;
        // Return unsubscribe function for existing subscription
        return () => this.unsubscribeFromNotifications(userId);
      } else {
        console.log(
          '📡 Existing subscription is not active (state:',
          channelState,
          '), removing and creating new one',
        );
        this.unsubscribeFromNotifications(userId);
      }
    }

    // Create new subscription
    this._createSubscription(userId, callback, 0);

    // Return unsubscribe function
    return () => {
      console.log('📡 Unsubscribing from notifications for user:', userId);
      this.unsubscribeFromNotifications(userId);
    };
  }

  /**
   * Clean up channel without removing subscription info (for retries)
   * @param userId - The user ID
   */
  private cleanupChannel(userId: string): void {
    const channel = this.subscriptions.get(userId);
    if (channel) {
      console.log(
        '📡 Cleaning up channel for user:',
        userId,
        'Channel state:',
        channel.state,
      );
      this.client.removeChannel(channel);
      this.subscriptions.delete(userId);
    }
  }

  /**
   * Unsubscribe from notifications for a user
   * @param userId - The user ID to unsubscribe for
   */
  unsubscribeFromNotifications(userId: string): void {
    const channel = this.subscriptions.get(userId);
    const subscriptionInfo = this.subscriptionInfo.get(userId);

    // Clear any pending retry timers
    if (subscriptionInfo?.retryTimer) {
      clearTimeout(subscriptionInfo.retryTimer);
      subscriptionInfo.retryTimer = null;
    }

    if (channel) {
      console.log(
        '📡 Removing channel for user:',
        userId,
        'Channel state:',
        channel.state,
      );
      this.client.removeChannel(channel);
      this.subscriptions.delete(userId);
      console.log(
        '📡 Channel removed, remaining subscriptions:',
        this.subscriptions.size,
      );
    } else {
      console.log('📡 No channel found to unsubscribe for user:', userId);
    }

    // Remove subscription info
    if (subscriptionInfo) {
      this.subscriptionInfo.delete(userId);
    }
  }

  /**
   * Refresh subscription for a user (useful for app state changes)
   * @param userId - The user ID to refresh subscription for
   */
  refreshSubscription(userId: string): void {
    const subscriptionInfo = this.subscriptionInfo.get(userId);
    if (!subscriptionInfo) {
      console.log('📡 No subscription found to refresh for user:', userId);
      return;
    }

    console.log('🔄 Refreshing subscription for user:', userId);
    // Clear any pending retry timers
    if (subscriptionInfo.retryTimer) {
      clearTimeout(subscriptionInfo.retryTimer);
      subscriptionInfo.retryTimer = null;
    }
    subscriptionInfo.isRetrying = false;
    subscriptionInfo.retryCount = 0;

    // Clean up existing subscription
    this.unsubscribeFromNotifications(userId);
    // Create new subscription with existing callback (reset retry count)
    this._createSubscription(userId, subscriptionInfo.callback, 0);
  }

  /**
   * Check connection health and re-subscribe if needed
   * @param userId - The user ID to check
   */
  checkConnectionHealth(userId: string): void {
    const channel = this.subscriptions.get(userId);
    const subscriptionInfo = this.subscriptionInfo.get(userId);

    if (!channel || !subscriptionInfo) {
      return;
    }

    const channelState = channel.state as string;
    const isHealthy =
      channelState === 'joined' || String(channelState).includes('SUBSCRIBED');

    if (!isHealthy && !subscriptionInfo.isRetrying) {
      console.log(
        '🔍 Connection health check failed for user:',
        userId,
        'State:',
        channelState,
      );
      console.log('🔄 Triggering reconnection...');
      this.retrySubscription(userId, subscriptionInfo.callback, 0);
    }
  }

  /**
   * Unsubscribe from all notifications
   */
  unsubscribeAll(): void {
    // Clear all retry timers
    this.subscriptionInfo.forEach(info => {
      if (info.retryTimer) {
        clearTimeout(info.retryTimer);
      }
    });

    // Remove all channels
    this.subscriptions.forEach(channel => {
      this.client.removeChannel(channel);
    });

    // Clear all maps
    this.subscriptions.clear();
    this.subscriptionInfo.clear();
  }
}

// Create singleton instance - this runs when the module is first imported
export const notificationService = new NotificationService();

/**
 * Initialize the notification service
 * Should be called once when the app starts, before using the service
 * @returns Promise that resolves when initialization is complete
 */
export const initializeNotificationService = async (): Promise<void> => {
  return notificationService.initialize();
};
