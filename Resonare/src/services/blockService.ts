import { supabase } from './supabase';
import { UserProfile } from '../types/database';

/**
 * Service for managing user blocks
 * Allows users to block/unblock other users and check block status
 */
class BlockService {
  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (blockerId === blockedId) {
        return { success: false, error: 'You cannot block yourself' };
      }

      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: blockerId,
          blocked_id: blockedId,
        });

      if (error) {
        if (error.code === '23505') {
          // Already blocked
          return { success: true };
        }
        throw error;
      }

      // Also unfollow the user if we're following them
      await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', blockerId)
        .eq('following_id', blockedId);

      // Also remove any pending follow requests
      await supabase
        .from('follow_requests')
        .delete()
        .or(`requester_id.eq.${blockerId},requested_id.eq.${blockerId}`)
        .or(`requester_id.eq.${blockedId},requested_id.eq.${blockedId}`);

      return { success: true };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: 'Failed to block user' };
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: 'Failed to unblock user' };
    }
  }

  /**
   * Check if a user has blocked another user
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking block status:', error);
      return false;
    }
  }

  /**
   * Check if either user has blocked the other (mutual block check)
   * This is useful for determining if content should be hidden
   */
  async hasBlockRelationship(userId1: string, userId2: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .or(`and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`)
        .limit(1);

      if (error) {
        throw error;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking block relationship:', error);
      return false;
    }
  }

  /**
   * Get list of users blocked by the current user
   */
  async getBlockedUsers(userId: string): Promise<UserProfile[]> {
    try {
      // First get blocked user IDs
      const { data: blockData, error: blockError } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', userId);

      if (blockError) {
        throw blockError;
      }

      if (!blockData || blockData.length === 0) {
        return [];
      }

      // Then get the user profiles
      const blockedIds = blockData.map(b => b.blocked_id);
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', blockedIds);

      if (profileError) {
        throw profileError;
      }

      return profileData || [];
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return [];
    }
  }

  /**
   * Get list of user IDs blocked by the current user
   * More efficient than getBlockedUsers when you only need IDs
   */
  async getBlockedUserIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', userId);

      if (error) {
        throw error;
      }

      return data?.map(b => b.blocked_id) || [];
    } catch (error) {
      console.error('Error getting blocked user IDs:', error);
      return [];
    }
  }

  /**
   * Get list of user IDs who have blocked the current user
   */
  async getUsersWhoBlockedMe(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocker_id')
        .eq('blocked_id', userId);

      if (error) {
        throw error;
      }

      return data?.map(b => b.blocker_id) || [];
    } catch (error) {
      console.error('Error getting users who blocked me:', error);
      return [];
    }
  }

  /**
   * Get all user IDs that should be filtered out (blocked by me or who blocked me)
   */
  async getAllBlockedUserIds(userId: string): Promise<string[]> {
    try {
      const [blockedByMe, blockedMe] = await Promise.all([
        this.getBlockedUserIds(userId),
        this.getUsersWhoBlockedMe(userId),
      ]);

      // Combine and deduplicate
      return [...new Set([...blockedByMe, ...blockedMe])];
    } catch (error) {
      console.error('Error getting all blocked user IDs:', error);
      return [];
    }
  }

  /**
   * Filter an array of user IDs to remove blocked users
   */
  async filterBlockedUsers(userId: string, userIds: string[]): Promise<string[]> {
    try {
      const blockedIds = await this.getAllBlockedUserIds(userId);
      return userIds.filter(id => !blockedIds.includes(id));
    } catch (error) {
      console.error('Error filtering blocked users:', error);
      return userIds;
    }
  }

  /**
   * Filter an array of objects with user_id field to remove blocked users
   */
  async filterBlockedContent<T extends { user_id: string }>(
    userId: string, 
    items: T[]
  ): Promise<T[]> {
    try {
      const blockedIds = await this.getAllBlockedUserIds(userId);
      return items.filter(item => !blockedIds.includes(item.user_id));
    } catch (error) {
      console.error('Error filtering blocked content:', error);
      return items;
    }
  }
}

// Export singleton instance
export const blockService = new BlockService();
