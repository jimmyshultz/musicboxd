import { supabase } from './supabase';
import { UserActivity, UserProfile, Album } from '../types/database';

// Enhanced activity type for display in feeds
export interface ActivityWithDetails extends UserActivity {
  user_profile: UserProfile;
  album: Album;
}

export class ActivityService {
  private client = supabase;

  // ============================================================================
  // ACTIVITY FEED QUERIES
  // ============================================================================

  /**
   * Get activity feed for a user's followed users
   * Shows recent activities from people the user follows
   */
  async getActivityFeed(userId: string, limit: number = 20): Promise<ActivityWithDetails[]> {
    try {
      // Get the list of users this user follows
      const { data: followingData, error: followError } = await this.client
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) throw followError;

      // If not following anyone, return empty feed
      if (!followingData || followingData.length === 0) {
        return [];
      }

      const followingIds = followingData.map(f => f.following_id);

      // Get activities from followed users, including user profiles and album data
      const { data: activities, error: activitiesError } = await this.client
        .from('user_activities')
        .select(`
          *,
          user_profile:user_profiles!user_activities_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            is_private
          ),
          album:albums!user_activities_album_id_fkey(
            id,
            name,
            artist_name,
            image_url,
            release_date
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (activitiesError) throw activitiesError;

      // Filter out activities from users who have gone private
      const publicActivities = (activities || []).filter(activity => 
        activity.user_profile && !activity.user_profile.is_private
      ) as ActivityWithDetails[];

      return publicActivities;
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      return [];
    }
  }

  /**
   * Get recent activities for a specific user
   * Used for user profile displays
   */
  async getUserActivities(userId: string, limit: number = 10): Promise<ActivityWithDetails[]> {
    try {
      const { data: activities, error } = await this.client
        .from('user_activities')
        .select(`
          *,
          user_profile:user_profiles!user_activities_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            is_private
          ),
          album:albums!user_activities_album_id_fkey(
            id,
            name,
            artist_name,
            image_url,
            release_date
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (activities || []) as ActivityWithDetails[];
    } catch (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }
  }

  /**
   * Get global activity feed for discovery
   * Shows recent public activities from all users
   */
  async getGlobalActivityFeed(limit: number = 20): Promise<ActivityWithDetails[]> {
    try {
      const { data: activities, error } = await this.client
        .from('user_activities')
        .select(`
          *,
          user_profile:user_profiles!user_activities_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            is_private
          ),
          album:albums!user_activities_album_id_fkey(
            id,
            name,
            artist_name,
            image_url,
            release_date
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to filter out private users

      if (error) throw error;

      // Filter out activities from private users
      const publicActivities = (activities || [])
        .filter(activity => activity.user_profile && !activity.user_profile.is_private)
        .slice(0, limit) as ActivityWithDetails[];

      return publicActivities;
    } catch (error) {
      console.error('Error fetching global activity feed:', error);
      return [];
    }
  }

  // ============================================================================
  // ACTIVITY STATISTICS
  // ============================================================================

  /**
   * Get activity statistics for a user
   */
  async getActivityStats(userId: string): Promise<{
    totalActivities: number;
    activitiesThisWeek: number;
    activitiesThisMonth: number;
    mostActiveDay: string | null;
  }> {
    try {
      const { data: activities, error } = await this.client
        .from('user_activities')
        .select('created_at')
        .eq('user_id', userId);

      if (error) throw error;

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activitiesThisWeek = (activities || []).filter(
        activity => new Date(activity.created_at) >= oneWeekAgo
      ).length;

      const activitiesThisMonth = (activities || []).filter(
        activity => new Date(activity.created_at) >= oneMonthAgo
      ).length;

      // Calculate most active day of the week
      const dayCount = new Array(7).fill(0);
      (activities || []).forEach(activity => {
        const day = new Date(activity.created_at).getDay();
        dayCount[day]++;
      });

      const maxCount = Math.max(...dayCount);
      const mostActiveDayIndex = maxCount > 0 ? dayCount.indexOf(maxCount) : null;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const mostActiveDay = mostActiveDayIndex !== null ? dayNames[mostActiveDayIndex] : null;

      return {
        totalActivities: (activities || []).length,
        activitiesThisWeek,
        activitiesThisMonth,
        mostActiveDay,
      };
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      return {
        totalActivities: 0,
        activitiesThisWeek: 0,
        activitiesThisMonth: 0,
        mostActiveDay: null,
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get activity type display text
   */
  getActivityDisplayText(activity: ActivityWithDetails): string {
    const username = activity.user_profile.display_name || activity.user_profile.username;
    const albumTitle = activity.album.name;
    
    switch (activity.activity_type) {
      case 'listen':
        return `${username} listened to ${albumTitle}`;
      case 'rating':
        const stars = activity.rating ? '★'.repeat(activity.rating) + '☆'.repeat(5 - activity.rating) : '';
        return `${username} rated ${albumTitle} ${stars}`;
      case 'review':
        return `${username} reviewed ${albumTitle}`;
      default:
        return `${username} interacted with ${albumTitle}`;
    }
  }

  /**
   * Format activity timestamp for display
   */
  formatActivityTime(createdAt: string): string {
    const now = new Date();
    const activityTime = new Date(createdAt);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return activityTime.toLocaleDateString();
  }
}

// Export singleton instance
export const activityService = new ActivityService();