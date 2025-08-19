import { supabase } from './supabase';
import { UserProfile, Database } from '../types/database';
import { User } from '@supabase/supabase-js';

// Type-safe Supabase client
type SupabaseClient = typeof supabase;

export class UserService {
  private client: SupabaseClient;

  constructor() {
    this.client = supabase;
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Get current user session
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.client.auth.getUser();
    return user;
  }

  /**
   * Get current user session
   */
  async getSession() {
    const { data: { session } } = await this.client.auth.getSession();
    return session;
  }

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  // ============================================================================
  // USER PROFILES
  // ============================================================================

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Get current user's profile
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    return this.getUserProfile(user.id);
  }

  /**
   * Create or update user profile
   */
  async upsertUserProfile(profile: Partial<UserProfile> & { id: string }): Promise<UserProfile> {
    const { data, error } = await this.client
      .from('user_profiles')
      .upsert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await this.client
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Search users by username or display name
   */
  async searchUsers(query: string, limit: number = 10): Promise<UserProfile[]> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .eq('is_private', false) // Only search public profiles
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found, username is available
      return true;
    }

    if (error) throw error;
    
    // Username exists
    return false;
  }

  // ============================================================================
  // FOLLOWING SYSTEM
  // ============================================================================

  /**
   * Follow a user
   */
  async followUser(followingId: string): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Must be authenticated to follow users');

    const { error } = await this.client
      .from('user_follows')
      .insert({
        follower_id: user.id,
        following_id: followingId,
      });

    if (error) throw error;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followingId: string): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Must be authenticated to unfollow users');

    const { error } = await this.client
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId);

    if (error) throw error;
  }

  /**
   * Check if current user is following another user
   */
  async isFollowing(followingId: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const { data, error } = await this.client
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found, not following
      return false;
    }

    if (error) throw error;
    return !!data;
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId: string): Promise<UserProfile[]> {
    const { data, error } = await this.client
      .from('user_follows')
      .select(`
        follower:user_profiles!user_follows_follower_id_fkey(*)
      `)
      .eq('following_id', userId);

    if (error) throw error;
    return data?.map((item: any) => item.follower).filter(Boolean) || [];
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string): Promise<UserProfile[]> {
    const { data, error } = await this.client
      .from('user_follows')
      .select(`
        following:user_profiles!user_follows_following_id_fkey(*)
      `)
      .eq('follower_id', userId);

    if (error) throw error;
    return data?.map((item: any) => item.following).filter(Boolean) || [];
  }

  /**
   * Get follower/following counts for a user
   */
  async getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [followersResult, followingResult] = await Promise.all([
      this.client
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId),
      this.client
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId),
    ]);

    if (followersResult.error) throw followersResult.error;
    if (followingResult.error) throw followingResult.error;

    return {
      followers: followersResult.count || 0,
      following: followingResult.count || 0,
    };
  }

  // ============================================================================
  // USER SUGGESTIONS
  // ============================================================================

  /**
   * Get suggested users to follow (basic implementation)
   * In a real app, this would use a recommendation algorithm
   */
  async getSuggestedUsers(limit: number = 5): Promise<UserProfile[]> {
    const user = await this.getCurrentUser();
    if (!user) return [];

    try {
      // Get users that the current user is not following
      const { data: followingData } = await this.client
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];
      
      // Build query to get public profiles, excluding current user
      let query = this.client
        .from('user_profiles')
        .select('*')
        .eq('is_private', false)
        .not('id', 'eq', user.id)
        .limit(limit);

      // Only add the NOT IN clause if there are following IDs
      if (followingIds.length > 0) {
        query = query.not('id', 'in', `(${followingIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching suggested users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSuggestedUsers:', error);
      return [];
    }
  }

  // ============================================================================
  // USER STATISTICS
  // ============================================================================

  /**
   * Get user statistics (albums listened, reviews, etc.)
   */
  async getUserStats(userId: string) {
    const [albumStats, followCounts] = await Promise.all([
      this.getUserAlbumStats(userId),
      this.getFollowCounts(userId),
    ]);

    return {
      ...albumStats,
      ...followCounts,
      listsCreated: 0, // Placeholder for future lists feature
    };
  }

  /**
   * Get user's album statistics
   */
  private async getUserAlbumStats(userId: string) {
    const { data, error } = await this.client
      .from('user_albums')
      .select('rating, is_listened')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user album stats:', error);
      return {
        albumsListened: 0,
        reviews: 0,
        averageRating: 0,
      };
    }

    const albumsListened = data?.filter(ua => ua.is_listened).length || 0;
    const ratingsData = data?.filter(ua => ua.rating !== null) || [];
    const reviews = ratingsData.length;
    const averageRating = reviews > 0 
      ? ratingsData.reduce((sum, ua) => sum + (ua.rating || 0), 0) / reviews 
      : 0;

    return {
      albumsListened,
      reviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    };
  }
}

// Export singleton instance
export const userService = new UserService();