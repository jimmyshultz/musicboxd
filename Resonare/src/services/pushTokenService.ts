import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { PushPreferences } from '../types/database';

/**
 * Service for managing push notification tokens and preferences
 * Handles FCM token registration, storage, and user preferences
 */
class PushTokenService {
  private client = supabase;
  private currentToken: string | null = null;
  private isInitialized = false;

  /**
   * Request notification permission from the user (iOS)
   * @returns Permission status
   */
  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Push notification permission granted');
      } else {
        console.log('❌ Push notification permission denied');
      }

      return enabled;
    } catch (error) {
      console.error('❌ Error requesting push notification permission:', error);
      return false;
    }
  }

  /**
   * Get the current FCM token
   * @returns FCM token or null if not available
   */
  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      this.currentToken = token;
      console.log('✅ FCM token retrieved');
      return token;
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Store the FCM token in Supabase for a user
   * @param userId - The user ID to associate the token with
   * @param token - The FCM token to store
   */
  async storeToken(userId: string, token: string): Promise<void> {
    try {
      const platform = Platform.OS as 'ios' | 'android';

      // Upsert the token (insert or update if exists)
      // Note: Using 'as any' cast because the push_tokens table types are added after initial schema generation
      const { error } = await (this.client.from('push_tokens') as any).upsert(
        {
          user_id: userId,
          token: token,
          platform: platform,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        },
      );

      if (error) {
        throw error;
      }

      console.log('✅ FCM token stored in database');
    } catch (error) {
      console.error('❌ Error storing FCM token:', error);
      throw error;
    }
  }

  /**
   * Request permission, get token, and store it for the user
   * This is the main initialization method to call after user login
   * @param userId - The user ID to register the token for
   */
  async registerToken(userId: string): Promise<void> {
    try {
      // Request permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('⚠️ Push notifications disabled - no permission');
        return;
      }

      // Get the token
      const token = await this.getToken();
      if (!token) {
        console.log('⚠️ Could not get FCM token');
        return;
      }

      // Store the token
      await this.storeToken(userId, token);
      this.isInitialized = true;

      console.log('✅ Push notification token registered successfully');
    } catch (error) {
      console.error('❌ Error registering push notification token:', error);
    }
  }

  /**
   * Set up listener for token refresh events
   * Should be called once during app initialization
   * @param userId - The user ID to associate refreshed tokens with
   * @returns Unsubscribe function
   */
  setupTokenRefreshListener(userId: string): () => void {
    const unsubscribe = messaging().onTokenRefresh(async (newToken: string) => {
      console.log('🔄 FCM token refreshed');
      try {
        await this.storeToken(userId, newToken);
        this.currentToken = newToken;
      } catch (error) {
        console.error('❌ Error storing refreshed token:', error);
      }
    });

    return unsubscribe;
  }

  /**
   * Deactivate the current device's token (call on logout)
   * Only deactivates the token for this specific device to support multi-device usage.
   * If the current token is not available in memory, attempts to fetch it from FCM.
   * @param userId - The user ID to deactivate token for
   */
  async deactivateToken(userId: string): Promise<void> {
    try {
      // Get the current device's token
      let tokenToDeactivate = this.currentToken;

      // If we don't have it in memory, try to get it from FCM
      if (!tokenToDeactivate) {
        try {
          tokenToDeactivate = await messaging().getToken();
        } catch (fcmError) {
          console.warn(
            '⚠️ Could not get FCM token for deactivation:',
            fcmError,
          );
        }
      }

      if (!tokenToDeactivate) {
        console.warn('⚠️ No token available to deactivate - skipping');
        return;
      }

      // Deactivate ONLY this device's token to support multi-device usage
      const { error } = await (this.client.from('push_tokens') as any)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('token', tokenToDeactivate)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      console.log('✅ Push token deactivated for current device');
      this.currentToken = null;
      this.isInitialized = false;
    } catch (error) {
      console.error('❌ Error deactivating push token:', error);
      // Don't throw - we want logout to continue even if this fails
    }
  }

  /**
   * Delete all tokens for a user
   * @param userId - The user ID to delete tokens for
   */
  async deleteAllTokens(userId: string): Promise<void> {
    try {
      const { error } = await (this.client.from('push_tokens') as any)
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log('✅ All push tokens deleted for user');
      this.currentToken = null;
      this.isInitialized = false;
    } catch (error) {
      console.error('❌ Error deleting push tokens:', error);
    }
  }

  // ============================================================================
  // Push Preferences
  // ============================================================================

  /**
   * Get push preferences for a user
   * @param userId - The user ID to get preferences for
   * @returns Push preferences or null if not found
   */
  async getPreferences(userId: string): Promise<PushPreferences | null> {
    try {
      const { data, error } = await (
        this.client.from('push_preferences') as any
      )
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found - return defaults
          return null;
        }
        throw error;
      }

      return data as PushPreferences;
    } catch (error) {
      console.error('❌ Error getting push preferences:', error);
      return null;
    }
  }

  /**
   * Update push preferences for a user
   * @param userId - The user ID to update preferences for
   * @param preferences - Partial preferences to update
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<
      Omit<PushPreferences, 'user_id' | 'created_at' | 'updated_at'>
    >,
  ): Promise<void> {
    try {
      // Note: Using 'as any' cast because the push_preferences table types are added after initial schema generation
      const { error } = await (
        this.client.from('push_preferences') as any
      ).upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      );

      if (error) {
        throw error;
      }

      console.log('✅ Push preferences updated');
    } catch (error) {
      console.error('❌ Error updating push preferences:', error);
      throw error;
    }
  }

  /**
   * Check if push notifications are enabled for a user
   * @param userId - The user ID to check
   * @returns Whether push notifications are enabled
   */
  async isPushEnabled(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs?.push_enabled ?? true; // Default to enabled
  }

  /**
   * Check if the service is initialized with a valid token
   */
  isRegistered(): boolean {
    return this.isInitialized && this.currentToken !== null;
  }
}

// Create singleton instance
export const pushTokenService = new PushTokenService();
