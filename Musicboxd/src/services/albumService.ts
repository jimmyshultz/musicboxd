import { Album, SearchResult, ApiResponse, Listen, Review } from '../types';
import { mockAlbums, popularGenres } from './mockData';

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
  ];

  // Fetch popular/trending albums
  static async getPopularAlbums(): Promise<ApiResponse<Album[]>> {
    await delay(500);
    return {
      data: mockAlbums,
      success: true,
      message: 'Albums fetched successfully',
    };
  }

  // Get album by ID
  static async getAlbumById(id: string): Promise<ApiResponse<Album | null>> {
    await delay(300);
    const album = mockAlbums.find(a => a.id === id);
    return {
      data: album || null,
      success: !!album,
      message: album ? 'Album found' : 'Album not found',
    };
  }

  // Search albums
  static async searchAlbums(query: string): Promise<ApiResponse<SearchResult>> {
    await delay(400);
    
    if (!query.trim()) {
      return {
        data: { albums: [], artists: [], totalResults: 0 },
        success: true,
        message: 'Empty query',
      };
    }

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
      message: `Found ${filteredAlbums.length} results`,
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

  // Get trending albums (mock implementation)
  static async getTrendingAlbums(): Promise<ApiResponse<Album[]>> {
    await delay(500);
    // Shuffle and return a subset for trending
    const shuffled = [...mockAlbums].sort(() => 0.5 - Math.random());
    return {
      data: shuffled.slice(0, 4),
      success: true,
      message: 'Trending albums fetched',
    };
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

  // Mark album as listened
  static async markAsListened(userId: string, albumId: string, notes?: string): Promise<ApiResponse<Listen>> {
    await delay(300);
    
    // Check if already listened
    const existingListen = this.userListens.find(
      listen => listen.userId === userId && listen.albumId === albumId
    );
    
    if (existingListen) {
      return {
        data: serializeListen(existingListen),
        success: false,
        message: 'Album already marked as listened',
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