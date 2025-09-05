import { Listen, Review, User } from '../types';
import { userService } from './userService';
import { AlbumService } from './albumService';

export interface UserStats {
  albumsThisYear: number;
  albumsAllTime: number;
  ratingsThisYear: number;
  ratingsAllTime: number;
  followers: number;
  following: number;
}

export interface UserActivityData {
  listens: Listen[];
  reviews: Review[];
  followers: User[];
  following: User[];
}

class UserStatsService {
  /**
   * Calculate user stats from provided activity data
   */
  calculateStats(activityData: UserActivityData): UserStats {
    const currentYear = new Date().getFullYear();
    
    // Filter listens and reviews by year
    const thisYearListens = activityData.listens.filter(listen => {
      const listenYear = new Date(listen.dateListened).getFullYear();
      return listenYear === currentYear;
    });
    
    const thisYearReviews = activityData.reviews.filter(review => {
      const reviewYear = new Date(review.dateReviewed).getFullYear();
      return reviewYear === currentYear;
    });
    
    return {
      albumsThisYear: thisYearListens.length,
      albumsAllTime: activityData.listens.length,
      ratingsThisYear: thisYearReviews.length,
      ratingsAllTime: activityData.reviews.length,
      followers: activityData.followers.length,
      following: activityData.following.length,
    };
  }

  /**
   * Fetch all activity data for a specific user
   */
  async fetchUserActivityData(userId: string): Promise<UserActivityData> {
    try {
      const [followers, following] = await Promise.all([
        userService.getUserFollowers(userId),
        userService.getUserFollowing(userId),
      ]);

      // Get listens and reviews from AlbumService
      const [listens, reviews] = await Promise.all([
        AlbumService.getUserListens(userId),
        AlbumService.getUserReviews(userId),
      ]);

      return {
        listens,
        reviews,
        followers,
        following,
      };
    } catch (error) {
      console.error('Error fetching user activity data:', error);
      throw error;
    }
  }

  /**
   * Get user stats for any user by userId
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const activityData = await this.fetchUserActivityData(userId);
    return this.calculateStats(activityData);
  }

  /**
   * Calculate stats from Redux state data (for current user)
   */
  calculateStatsFromRedux(
    listens: Listen[],
    reviews: Review[],
    followers: User[],
    following: User[]
  ): UserStats {
    return this.calculateStats({
      listens,
      reviews,
      followers,
      following,
    });
  }
}

export const userStatsService = new UserStatsService();