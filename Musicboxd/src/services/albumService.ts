import { Album, SearchResult, ApiResponse } from '../types';
import { mockAlbums, popularGenres } from './mockData';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class AlbumService {
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
    const album = mockAlbums.find(album => album.id === id);
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