import { Album, SearchResult, ApiResponse, Listen, Review } from '../types';
import { mockAlbums, popularGenres } from './mockData';
import { SpotifyService } from './spotifyService';
import { SpotifyMapper } from './spotifyMapper';
import { SPOTIFY_CONFIG } from '../config/spotify';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to serialize a review
function serializeReview(review: Review): any {
  return {
    ...review,
    dateReviewed: review.dateReviewed instanceof Date
      ? review.dateReviewed.toISOString()
      : review.dateReviewed,
  };
}

// Helper to serialize a listen
function serializeListen(listen: Listen): any {
  return {
    ...listen,
    dateListened: listen.dateListened instanceof Date
      ? listen.dateListened.toISOString()
      : listen.dateListened,
  };
}

export class AlbumService {
  // Store user interactions in memory (in real app, this would be API calls)
  private static userListens: Listen[] = [
    // Add some demo data for testing
    {
      id: 'listen_demo_1',
      userId: 'current-user-id',
      albumId: '1',
      dateListened: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      id: 'listen_demo_2',
      userId: 'current-user-id',
      albumId: '3',
      dateListened: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      id: 'listen_demo_3',
      userId: 'current-user-id',
      albumId: '4',
      dateListened: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    },
    {
      id: 'listen_demo_4',
      userId: 'current-user-id',
      albumId: '2',
      dateListened: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    },
    {
      id: 'listen_demo_5',
      userId: 'current-user-id',
      albumId: '5',
      dateListened: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
    },
    // Add data for user1 (indierocklover)
    {
      id: 'listen_user1_1',
      userId: 'user1',
      albumId: '2',
      dateListened: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: 'listen_user1_2',
      userId: 'user1',
      albumId: '4',
      dateListened: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      id: 'listen_user1_3',
      userId: 'user1',
      albumId: '1',
      dateListened: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    },
    {
      id: 'listen_user1_4',
      userId: 'user1',
      albumId: '5', // Same as user2 - creates overlap
      dateListened: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      id: 'listen_user1_5',
      userId: 'user1',
      albumId: '7', // Same as user3 - creates overlap
      dateListened: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
    // Add data for user2 (jazzfanatic)
    {
      id: 'listen_user2_1',
      userId: 'user2',
      albumId: '5',
      dateListened: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      id: 'listen_user2_2',
      userId: 'user2',
      albumId: '6',
      dateListened: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
    {
      id: 'listen_user2_3',
      userId: 'user2',
      albumId: '1', // Same as user1 - creates overlap
      dateListened: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
    },
    {
      id: 'listen_user2_4',
      userId: 'user2',
      albumId: '7', // Same as user1 & user3 - creates 3-way overlap
      dateListened: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    },
    // Add data for user3 (hiphophead)
    {
      id: 'listen_user3_1',
      userId: 'user3',
      albumId: '7', // Same as user1 & user2 - creates 3-way overlap
      dateListened: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: 'listen_user3_2',
      userId: 'user3',
      albumId: '8',
      dateListened: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    },
    {
      id: 'listen_user3_3',
      userId: 'user3',
      albumId: '1', // Same as user1 & user2 - creates 3-way overlap
      dateListened: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11 days ago
    },
    {
      id: 'listen_user3_4',
      userId: 'user3',
      albumId: '4', // Same as user1 - creates overlap
      dateListened: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
    },
  ];
  
  private static userReviews: Review[] = [
    // Add some demo ratings data for testing
    {
      id: 'review_demo_1',
      userId: 'current-user-id',
      albumId: '1',
      rating: 5,
      dateReviewed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      likesCount: 0,
      commentsCount: 0,
    },
    {
      id: 'review_demo_2',
      userId: 'current-user-id',
      albumId: '3',
      rating: 4,
      dateReviewed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      likesCount: 0,
      commentsCount: 0,
    },
    {
      id: 'review_demo_3',
      userId: 'current-user-id',
      albumId: '4',
      rating: 5,
      dateReviewed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      likesCount: 0,
      commentsCount: 0,
    },
    {
      id: 'review_demo_4',
      userId: 'current-user-id',
      albumId: '2',
      rating: 5,
      dateReviewed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      likesCount: 0,
      commentsCount: 0,
    },
    // Add review data for user1 (indierocklover)
    {
      id: 'review_user1_1',
      userId: 'user1',
      albumId: '2',
      rating: 4,
      dateReviewed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      likesCount: 2,
      commentsCount: 1,
    },
    {
      id: 'review_user1_2',
      userId: 'user1',
      albumId: '4',
      rating: 5,
      dateReviewed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      likesCount: 5,
      commentsCount: 2,
    },
    // Add review data for user2 (jazzfanatic)
    {
      id: 'review_user2_1',
      userId: 'user2',
      albumId: '5',
      rating: 5,
      dateReviewed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      likesCount: 3,
      commentsCount: 0,
    },
    {
      id: 'review_user2_2',
      userId: 'user2',
      albumId: '1', // Overlapping album with user1 & user3
      rating: 4,
      dateReviewed: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      likesCount: 2,
      commentsCount: 1,
    },
    {
      id: 'review_user2_3',
      userId: 'user2',
      albumId: '7', // Overlapping album with user1 & user3
      rating: 5,
      dateReviewed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      likesCount: 6,
      commentsCount: 2,
    },
    // Add review data for user3 (hiphophead)
    {
      id: 'review_user3_1',
      userId: 'user3',
      albumId: '7', // Overlapping album with user1 & user2
      rating: 4,
      dateReviewed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      likesCount: 8,
      commentsCount: 3,
    },
    {
      id: 'review_user3_2',
      userId: 'user3',
      albumId: '1', // Overlapping album with user1 & user2
      rating: 3,
      dateReviewed: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      likesCount: 1,
      commentsCount: 0,
    },
  ];

  // Get popular albums based on user activity in our app
  // TODO: This should show albums that are popular among ALL users in the last week
  // For now, returns empty until social features and user activity tracking are implemented
  static async getPopularAlbums(): Promise<ApiResponse<Album[]>> {
    // TODO: Implement actual popular logic when social features are ready:
    // 1. Query Supabase for user_listens table
    // 2. Filter by dateListened >= 7 days ago  
    // 3. Group by albumId and count occurrences across ALL users
    // 4. Order by listen count DESC
    // 5. Return top 10-20 albums that are actually popular in our community
    
    await delay(300);
    return {
      data: [], // Empty until we have real user activity data
      success: true,
      message: 'Popular albums not available yet - requires social features implementation',
    };
  }

  // Get album by ID
  static async getAlbumById(id: string): Promise<ApiResponse<Album | null>> {
    try {
      // First check if this is a Spotify ID (should be alphanumeric)
      const isSpotifyId = /^[a-zA-Z0-9]+$/.test(id) && id.length > 10;
      
      if (isSpotifyId && SpotifyService.isConfigured()) {
        try {
          // Try to fetch from Spotify API
          const spotifyAlbum = await SpotifyService.getAlbum(id);
          
          if (SpotifyMapper.isValidSpotifyAlbum(spotifyAlbum)) {
            const album = SpotifyMapper.mapSpotifyAlbumToAlbum(spotifyAlbum);
            return {
              data: album,
              success: true,
              message: 'Album found on Spotify',
            };
          }
        } catch (spotifyError) {
          // Continue to check mock data if Spotify fails
        }
      }
      
      // Check mock data (for backward compatibility and fallback)
      await delay(300);
      const mockAlbum = mockAlbums.find(a => a.id === id);
      
      if (mockAlbum) {
        return {
          data: mockAlbum,
          success: true,
          message: 'Album found in local data',
        };
      }
      
      // If it's a Spotify ID but we couldn't fetch it, try to find by external ID in mock data
      const albumBySpotifyId = mockAlbums.find(a => a.externalIds.spotify === id);
      if (albumBySpotifyId) {
        return {
          data: albumBySpotifyId,
          success: true,
          message: 'Album found by Spotify ID in local data',
        };
      }
      
      return {
        data: null,
        success: false,
        message: 'Album not found',
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: 'Error fetching album',
      };
    }
  }

  // Search albums
  static async searchAlbums(query: string): Promise<ApiResponse<SearchResult>> {
    if (!query.trim()) {
      return {
        data: { albums: [], artists: [], totalResults: 0 },
        success: true,
        message: 'Empty query',
      };
    }

    try {
      // Check if Spotify is configured
      if (!SpotifyService.isConfigured()) {
        return this.searchMockData(query);
      }

      // Search Spotify API
      const spotifyResponse = await SpotifyService.searchAlbums(query, 20);
      
      if (!spotifyResponse.albums?.items) {
        return this.searchMockData(query);
      }

      // Convert Spotify results to our format
      const searchResult = SpotifyMapper.mapSpotifySearchToSearchResult(spotifyResponse);
      
      // If no results from Spotify, also search mock data for better coverage
      if (searchResult.albums.length === 0) {
        return this.searchMockData(query);
      }

      return {
        data: searchResult,
        success: true,
        message: `Found ${searchResult.totalResults} results from Spotify`,
      };
    } catch (error) {
      // Fallback to mock data search on error
      return this.searchMockData(query);
    }
  }

  // Helper method to search mock data
  private static async searchMockData(query: string): Promise<ApiResponse<SearchResult>> {
    await delay(400);
    
    const lowercaseQuery = query.toLowerCase();
    
    // Filter albums by title or artist
    const filteredAlbums = mockAlbums.filter(album => 
      album.title.toLowerCase().includes(lowercaseQuery) ||
      album.artist.toLowerCase().includes(lowercaseQuery) ||
      album.genre.some(genre => genre.toLowerCase().includes(lowercaseQuery))
    );

    // Extract unique artists from filtered albums
    const artists = [...new Set(filteredAlbums.map(album => album.artist))];

    const searchResult: SearchResult = {
      albums: filteredAlbums,
      artists,
      totalResults: filteredAlbums.length,
    };

    return {
      data: searchResult,
      success: true,
      message: `Found ${filteredAlbums.length} results (local data)`,
    };
  }

  // Get albums by genre
  static async getAlbumsByGenre(genre: string): Promise<ApiResponse<Album[]>> {
    await delay(400);
    
    const filteredAlbums = mockAlbums.filter(album =>
      album.genre.some(g => g.toLowerCase() === genre.toLowerCase())
    );

    return {
      data: filteredAlbums,
      success: true,
      message: `Found ${filteredAlbums.length} albums in ${genre}`,
    };
  }

  // Get trending albums based on user activity in our app
  // TODO: This should query the database for albums marked as "listened" most frequently in the last 7 days
  // For now, returns mock data until social features and user activity tracking are implemented
  static async getTrendingAlbums(): Promise<ApiResponse<Album[]>> {
    try {
      // TODO: Implement actual trending logic when social features are ready:
      // 1. Query Supabase for user_listens table
      // 2. Filter by dateListened >= 7 days ago
      // 3. Group by albumId and count occurrences
      // 4. Order by listen count DESC
      // 5. Take top 4-6 albums
      // 6. Fetch album details for each trending album
      
      /* FUTURE IMPLEMENTATION (Week 4-5):
      
      const { data: recentListens, error } = await supabase
        .from('user_listens')
        .select('album_id')
        .gte('date_listened', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('date_listened', { ascending: false });
      
      if (error) throw error;
      
      // Count occurrences of each album
      const albumCounts = recentListens.reduce((acc, listen) => {
        acc[listen.album_id] = (acc[listen.album_id] || 0) + 1;
        return acc;
      }, {});
      
      // Sort by count and take top albums
      const trendingAlbumIds = Object.entries(albumCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 4)
        .map(([albumId]) => albumId);
      
      // Fetch album details for trending albums
      const trendingAlbums = await Promise.all(
        trendingAlbumIds.map(albumId => this.getAlbumById(albumId))
      );
      
      return {
        data: trendingAlbums.filter(response => response.success).map(response => response.data),
        success: true,
        message: `Trending albums based on ${recentListens.length} user listens this week`,
      };
      
      */
      
      await delay(300);
      return {
        data: [], // Empty until we have real user activity data
        success: true,
        message: 'Trending albums not available yet - requires social features implementation',
      };
      
    } catch (error) {
      // Fallback to basic mock data on error
      await delay(300);
      const shuffled = [...mockAlbums].sort(() => 0.5 - Math.random());
      return {
        data: shuffled.slice(0, 4),
        success: true,
        message: 'Trending albums fetched (fallback)',
      };
    }
  }

  // Get new releases (mock implementation)
  static async getNewReleases(): Promise<ApiResponse<Album[]>> {
    await delay(500);
    // Sort by release date (newest first) and return top 5
    const sorted = [...mockAlbums].sort((a, b) => 
      new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
    );
    return {
      data: sorted.slice(0, 5),
      success: true,
      message: 'New releases fetched',
    };
  }

  // Get popular genres
  static async getPopularGenres(): Promise<ApiResponse<string[]>> {
    await delay(200);
    return {
      data: popularGenres,
      success: true,
      message: 'Popular genres fetched',
    };
  }

  // Add listen
  static async addListened(userId: string, albumId: string, notes?: string): Promise<ApiResponse<Listen>> {
    await delay(300);
    
    // Check if already listened
    const existingListen = this.userListens.find(
      listen => listen.userId === userId && listen.albumId === albumId
    );
    
    if (existingListen) {
      // Update the existing listen with new timestamp
      existingListen.dateListened = new Date();
      existingListen.notes = notes;
      
      return {
        data: serializeListen(existingListen),
        success: true,
        message: 'Album listen timestamp updated',
      };
    }

    const newListen: Listen = {
      id: `listen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      albumId,
      dateListened: new Date(),
      notes,
    };

    this.userListens.push(newListen);

    return {
      data: serializeListen(newListen),
      success: true,
      message: 'Album marked as listened',
    };
  }

  // Remove listen
  static async removeListened(userId: string, albumId: string): Promise<ApiResponse<void>> {
    await delay(300);
    
    const index = this.userListens.findIndex(
      listen => listen.userId === userId && listen.albumId === albumId
    );
    
    if (index === -1) {
      return {
        data: undefined,
        success: false,
        message: 'Listen not found',
      };
    }

    this.userListens.splice(index, 1);

    return {
      data: undefined,
      success: true,
      message: 'Listen removed',
    };
  }

  // Check if user has listened to album
  static async hasUserListened(userId: string, albumId: string): Promise<boolean> {
    return this.userListens.some(
      listen => listen.userId === userId && listen.albumId === albumId
    );
  }

  // Add or update rating
  static async addReview(
    userId: string, 
    albumId: string, 
    rating: number, 
    reviewText?: string
  ): Promise<ApiResponse<Review>> {
    await delay(300);
    
    // Check if review already exists
    const existingReviewIndex = this.userReviews.findIndex(
      review => review.userId === userId && review.albumId === albumId
    );

    if (existingReviewIndex !== -1) {
      // Update existing review
      const updatedReview: Review = {
        ...this.userReviews[existingReviewIndex],
        rating,
        reviewText,
        dateReviewed: new Date(),
      };
      
      this.userReviews[existingReviewIndex] = updatedReview;
      
      return {
        data: serializeReview(updatedReview),
        success: true,
        message: 'Review updated',
      };
    } else {
      // Create new review
      const newReview: Review = {
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        albumId,
        rating,
        reviewText,
        dateReviewed: new Date(),
        likesCount: 0,
        commentsCount: 0,
      };

      this.userReviews.push(newReview);

      return {
        data: serializeReview(newReview),
        success: true,
        message: 'Review added',
      };
    }
  }

  // Remove review
  static async removeReview(userId: string, albumId: string): Promise<ApiResponse<void>> {
    await delay(300);
    
    const index = this.userReviews.findIndex(
      review => review.userId === userId && review.albumId === albumId
    );
    
    if (index === -1) {
      return {
        data: undefined,
        success: false,
        message: 'Review not found',
      };
    }

    this.userReviews.splice(index, 1);

    return {
      data: undefined,
      success: true,
      message: 'Review removed',
    };
  }

  // Get user's review for album
  static async getUserReview(userId: string, albumId: string): Promise<Review | null> {
    const review = this.userReviews.find(
      r => r.userId === userId && r.albumId === albumId
    ) || null;
    return review ? serializeReview(review) : null;
  }

  // Get user's listens
  static async getUserListens(userId: string): Promise<Listen[]> {
    await delay(300);
    return this.userListens
      .filter(listen => listen.userId === userId)
      .map(serializeListen);
  }

  // Get user's reviews
  static async getUserReviews(userId: string): Promise<Review[]> {
    await delay(300);
    return this.userReviews
      .filter(review => review.userId === userId)
      .map(serializeReview);
  }

  // Get user stats
  static async getUserAlbumStats(userId: string): Promise<{
    albumsListened: number;
    reviews: number;
    averageRating: number;
  }> {
    const userListens = await this.getUserListens(userId);
    const userReviews = await this.getUserReviews(userId);
    
    const averageRating = userReviews.length > 0 
      ? userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length
      : 0;

    return {
      albumsListened: userListens.length,
      reviews: userReviews.length,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
    };
  }

  // Format duration from seconds to mm:ss
  static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Calculate total album duration
  static getTotalDuration(album: Album): number {
    return album.trackList.reduce((total, track) => total + track.duration, 0);
  }

  // Get album year from release date
  static getAlbumYear(releaseDate: string): string {
    return new Date(releaseDate).getFullYear().toString();
  }
}