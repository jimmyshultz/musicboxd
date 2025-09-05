import { albumListensService } from './albumListensService';
import { albumRatingsService } from './albumRatingsService';
import { diaryEntriesService } from './diaryEntriesService';
import { userService } from './userService';

export interface UserStatsV2 {
  albumsThisYear: number;
  albumsAllTime: number;
  ratingsThisYear: number;
  ratingsAllTime: number;
  averageRating: number;
  diaryEntries: number;
  followers: number;
  following: number;
}

class UserStatsServiceV2 {
  /**
   * Get comprehensive user statistics
   */
  async getUserStats(userId: string): Promise<UserStatsV2> {
    try {
      const [
        albumsAllTime,
        albumsThisYear,
        ratingsAllTime,
        ratingsThisYear,
        averageRating,
        diaryEntries,
        followersData,
        followingData
      ] = await Promise.all([
        albumListensService.getUserListenCount(userId),
        albumListensService.getUserListenCountThisYear(userId),
        albumRatingsService.getUserRatingCount(userId),
        albumRatingsService.getUserRatingCountThisYear(userId),
        albumRatingsService.getUserAverageRating(userId),
        diaryEntriesService.getUserDiaryCount(userId),
        userService.getUserFollowers(userId),
        userService.getUserFollowing(userId)
      ]);

      return {
        albumsThisYear,
        albumsAllTime,
        ratingsThisYear,
        ratingsAllTime,
        averageRating,
        diaryEntries,
        followers: followersData.length,
        following: followingData.length
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      // Return empty stats on error
      return {
        albumsThisYear: 0,
        albumsAllTime: 0,
        ratingsThisYear: 0,
        ratingsAllTime: 0,
        averageRating: 0,
        diaryEntries: 0,
        followers: 0,
        following: 0
      };
    }
  }

  /**
   * Get user's recent listening activity for profile display
   */
  async getRecentActivity(userId: string, limit: number = 5) {
    try {
      // Get recent diary entries which represent actual listening sessions
      const recentEntries = await diaryEntriesService.getRecentDiaryEntries(userId, limit);
      
      return recentEntries.map(entry => ({
        album: {
          id: entry.albums.id,
          title: entry.albums.name,
          artist: entry.albums.artist_name,
          releaseDate: entry.albums.release_date || '',
          genre: entry.albums.genres || [],
          coverImageUrl: entry.albums.image_url || '',
          spotifyUrl: entry.albums.spotify_url || '',
          totalTracks: entry.albums.total_tracks || 0,
          albumType: entry.albums.album_type || 'album',
          trackList: [], // Empty for now
        },
        listen: {
          id: entry.id,
          userId: entry.user_id,
          albumId: entry.album_id,
          dateListened: new Date(entry.diary_date),
        },
        review: entry.rating ? {
          id: `review_${entry.album_id}_${entry.user_id}`,
          userId: entry.user_id,
          albumId: entry.album_id,
          rating: entry.rating,
          review: entry.notes || '',
          dateReviewed: entry.created_at,
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Get user's listening history (for ListenedAlbumsScreen)
   */
  async getUserListeningHistory(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const listeningHistory = await albumListensService.getUserListenedAlbums(userId, limit, offset);
      
      return listeningHistory.map(item => ({
        id: item.albums.id,
        name: item.albums.name,
        artist_name: item.albums.artist_name,
        release_date: item.albums.release_date,
        image_url: item.albums.image_url,
        spotify_url: item.albums.spotify_url,
        total_tracks: item.albums.total_tracks,
        album_type: item.albums.album_type,
        genres: item.albums.genres,
        interaction: {
          id: item.id,
          user_id: item.user_id,
          album_id: item.album_id,
          rating: null, // Would need to fetch from ratings table if needed
          is_listened: item.is_listened,
          listened_at: item.first_listened_at,
          review: null,
          created_at: item.created_at,
          updated_at: item.updated_at
        }
      }));
    } catch (error) {
      console.error('Error getting user listening history:', error);
      return [];
    }
  }

  /**
   * Get user's rated albums (for UserReviewsScreen)
   */
  async getUserRatedAlbums(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const ratedAlbums = await albumRatingsService.getUserRatedAlbums(userId, limit, offset);
      
      return ratedAlbums.map(item => ({
        id: item.albums.id,
        name: item.albums.name,
        artist_name: item.albums.artist_name,
        release_date: item.albums.release_date,
        image_url: item.albums.image_url,
        spotify_url: item.albums.spotify_url,
        total_tracks: item.albums.total_tracks,
        album_type: item.albums.album_type,
        genres: item.albums.genres,
        interaction: {
          id: item.id,
          user_id: item.user_id,
          album_id: item.album_id,
          rating: item.rating,
          is_listened: null, // Would need to fetch from listens table if needed
          listened_at: null,
          review: item.review,
          created_at: item.created_at,
          updated_at: item.updated_at
        }
      }));
    } catch (error) {
      console.error('Error getting user rated albums:', error);
      return [];
    }
  }
}

export const userStatsServiceV2 = new UserStatsServiceV2();