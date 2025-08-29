import { supabase } from './supabase';
import { UserProfile, FollowRequest } from '../types/database';
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
   * Alias for updateUserProfile for convenience
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.updateUserProfile(userId, updates);
  }

  /**
   * Search users by username or display name (respects privacy + existing relationships)
   */
  async searchUsers(query: string, limit: number = 10): Promise<UserProfile[]> {
    const currentUser = await this.getCurrentUser();
    
    if (!currentUser) {
      // Not logged in - only show public profiles
      const { data, error } = await this.client
        .from('user_profiles')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .eq('is_private', false)
        .limit(limit);

      if (error) throw error;
      return data || [];
    }

    // With RLS policy updated, we can search directly without manual filtering
    // The database policy will handle privacy automatically
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const { error } = await this.client
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
   * Follow a user (handles both public follows and private requests)
   */
  async followUser(followingId: string): Promise<{ type: 'followed' | 'requested' }> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Must be authenticated to follow users');

    // Check what action is appropriate
    const actionType = await this.getFollowActionType(user.id, followingId);

    if (actionType === 'following') {
      throw new Error('Already following this user');
    }
    
    if (actionType === 'requested') {
      throw new Error('Follow request already sent');
    }

    if (actionType === 'request') {
      // Send follow request for private profile
      await this.sendFollowRequest(user.id, followingId);
      return { type: 'requested' };
    } else {
      // Direct follow for public profile
      const { error } = await this.client
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: followingId,
        });

      if (error) throw error;
      return { type: 'followed' };
    }
  }

  /**
   * Unfollow a user (or cancel pending request)
   */
  async unfollowUser(followingId: string): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Must be authenticated to unfollow users');

    // Check current relationship status
    const actionType = await this.getFollowActionType(user.id, followingId);

    if (actionType === 'requested') {
      // Cancel pending follow request
      const pendingRequest = await this.getFollowRequestStatus(user.id, followingId);
      if (pendingRequest) {
        await this.cancelFollowRequest(pendingRequest.id);
      }
    } else if (actionType === 'following') {
      // Remove existing follow relationship
      const { error } = await this.client
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId);

      if (error) throw error;
    }
    // If actionType is 'follow' or 'request', there's nothing to unfollow
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
    try {
      // Get follower IDs first
      const { data: followData, error: followError } = await this.client
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (followError) throw followError;
      
      if (!followData || followData.length === 0) {
        return [];
      }

      const followerIds = followData.map(f => f.follower_id);

      // Get user profiles for those IDs
      const { data: profileData, error: profileError } = await this.client
        .from('user_profiles')
        .select('*')
        .in('id', followerIds);

      if (profileError) throw profileError;
      return profileData || [];
    } catch (error) {
      console.error('Error fetching followers:', error);
      return [];
    }
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string): Promise<UserProfile[]> {
    try {
      // Get following IDs first
      const { data: followData, error: followError } = await this.client
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) throw followError;
      
      if (!followData || followData.length === 0) {
        return [];
      }

      const followingIds = followData.map(f => f.following_id);

      // Get user profiles for those IDs
      const { data: profileData, error: profileError } = await this.client
        .from('user_profiles')
        .select('*')
        .in('id', followingIds);

      if (profileError) throw profileError;
      return profileData || [];
    } catch (error) {
      console.error('Error fetching following:', error);
      return [];
    }
  }

  // Legacy method names for backward compatibility
  /**
   * @deprecated Use getUserProfile instead
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    return this.getUserProfile(userId);
  }

  /**
   * Get users that follow the specified user
   */
  async getFollowers(userId: string): Promise<UserProfile[]> {
    // Get follower IDs first
    const { data: followData, error: followError } = await this.client
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (followError) throw followError;
    if (!followData || followData.length === 0) return [];

    // Get user profiles for follower IDs
    const followerIds = followData.map(row => row.follower_id);
    const { data: profileData, error: profileError } = await this.client
      .from('user_profiles')
      .select('*')
      .in('id', followerIds);

    if (profileError) throw profileError;
    return profileData || [];
  }

  /**
   * Get users that the specified user is following
   */
  async getFollowing(userId: string): Promise<UserProfile[]> {
    // Get following IDs first
    const { data: followData, error: followError } = await this.client
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followError) throw followError;
    if (!followData || followData.length === 0) return [];

    // Get user profiles for following IDs
    const followingIds = followData.map(row => row.following_id);
    const { data: profileData, error: profileError } = await this.client
      .from('user_profiles')
      .select('*')
      .in('id', followingIds);

    if (profileError) throw profileError;
    return profileData || [];
  }

  /**
   * @deprecated Use getFollowers instead
   */
  async getUserFollowers(userId: string): Promise<UserProfile[]> {
    return this.getFollowers(userId);
  }

  /**
   * @deprecated Use getFollowing instead
   */
  async getUserFollowing(userId: string): Promise<UserProfile[]> {
    return this.getFollowing(userId);
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

  // ============================================================================
  // FOLLOW REQUESTS (for private profiles)
  // ============================================================================

  /**
   * Send a follow request to a user
   */
  async sendFollowRequest(requesterId: string, requestedId: string): Promise<FollowRequest> {
    // Check if there's already a request (any status)
    const { data: existing, error: checkError } = await this.client
      .from('follow_requests')
      .select('*')
      .eq('requester_id', requesterId)
      .eq('requested_id', requestedId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      if (existing.status === 'pending') {
        // Already have a pending request, return it
        return existing;
      } else {
        // Delete the old request and create a new one (RLS prevents requester from updating)
        const { error: deleteError } = await this.client
          .from('follow_requests')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;

        // Create new request
        const { data, error } = await this.client
          .from('follow_requests')
          .insert({
            requester_id: requesterId,
            requested_id: requestedId,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } else {
      // Create new request
      const { data, error } = await this.client
        .from('follow_requests')
        .insert({
          requester_id: requesterId,
          requested_id: requestedId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  /**
   * Accept a follow request (auto-creates follow relationship)
   */
  async acceptFollowRequest(requestId: string): Promise<void> {
    // Start a transaction-like operation
    // First, get the request details
    const { data: request, error: fetchError } = await this.client
      .from('follow_requests')
      .select('requester_id, requested_id')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (fetchError) throw fetchError;
    if (!request) throw new Error('Follow request not found or already processed');

    // Update request status to accepted
    const { error: updateError } = await this.client
      .from('follow_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Create the follow relationship
    const { error: followError } = await this.client
      .from('user_follows')
      .insert({
        follower_id: request.requester_id,
        following_id: request.requested_id
      });

    if (followError) throw followError;
  }

  /**
   * Reject a follow request
   */
  async rejectFollowRequest(requestId: string): Promise<void> {
    const { error } = await this.client
      .from('follow_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;
  }

  /**
   * Cancel a follow request (for requester)
   */
  async cancelFollowRequest(requestId: string): Promise<void> {
    const { error } = await this.client
      .from('follow_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  }

  /**
   * Get pending follow requests for a user (requests they received)
   */
  async getPendingFollowRequests(userId: string): Promise<FollowRequest[]> {
    // Get the basic request data first
    const { data: requestData, error: requestError } = await this.client
      .from('follow_requests')
      .select('*')
      .eq('requested_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestError) throw requestError;
    if (!requestData || requestData.length === 0) return [];

    // Get requester profiles
    const requesterIds = requestData.map(req => req.requester_id);
    const { data: profileData, error: profileError } = await this.client
      .from('user_profiles')
      .select('*')
      .in('id', requesterIds);

    if (profileError) throw profileError;

    // Combine request data with requester profiles
    return requestData.map(request => ({
      ...request,
      requester: profileData?.find(profile => profile.id === request.requester_id)
    }));
  }

  /**
   * Get sent follow requests for a user (requests they sent)
   */
  async getSentFollowRequests(userId: string): Promise<FollowRequest[]> {
    // Get the basic request data first
    const { data: requestData, error: requestError } = await this.client
      .from('follow_requests')
      .select('*')
      .eq('requester_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestError) throw requestError;
    if (!requestData || requestData.length === 0) return [];

    // Get requested user profiles
    const requestedIds = requestData.map(req => req.requested_id);
    const { data: profileData, error: profileError } = await this.client
      .from('user_profiles')
      .select('*')
      .in('id', requestedIds);

    if (profileError) throw profileError;

    // Combine request data with requested user profiles
    return requestData.map(request => ({
      ...request,
      requested: profileData?.find(profile => profile.id === request.requested_id)
    }));
  }

  /**
   * Check if there's a pending follow request between two users
   */
  async getFollowRequestStatus(requesterId: string, requestedId: string): Promise<FollowRequest | null> {
    const { data, error } = await this.client
      .from('follow_requests')
      .select('*')
      .eq('requester_id', requesterId)
      .eq('requested_id', requestedId)
      .eq('status', 'pending')
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found, not following
      return false;
    }
    
    if (error) throw error;
    return !!data;
  }

  /**
   * Check what follow action is appropriate for a user
   * Returns: 'follow' | 'request' | 'requested' | 'following'
   */
  async getFollowActionType(currentUserId: string, targetUserId: string): Promise<'follow' | 'request' | 'requested' | 'following'> {
    if (currentUserId === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following
    const existingFollow = await this.isFollowing(currentUserId, targetUserId);
    if (existingFollow) {
      return 'following';
    }

    // Check if there's a pending request
    const pendingRequest = await this.getFollowRequestStatus(currentUserId, targetUserId);
    if (pendingRequest) {
      return 'requested';
    }

    // Check if target user is private
    const targetProfile = await this.getUserProfile(targetUserId);
    if (targetProfile?.is_private) {
      return 'request';
    }

    return 'follow';
  }
}

// Export singleton instance
export const userService = new UserService();