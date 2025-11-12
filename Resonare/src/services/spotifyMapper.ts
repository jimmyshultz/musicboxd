import { Album, Track, SearchResult, Artist } from '../types';
import {
  SpotifyAlbum,
  SpotifyTrack,
  SpotifySearchResponse,
  SpotifyImage,
  SpotifyArtistFull,
} from '../types/spotify';

export class SpotifyMapper {
  /**
   * Get the best image URL from Spotify images array
   * Prefers medium-sized images (around 300px) for optimal display
   */
  private static getBestImageUrl(images: SpotifyImage[]): string {
    if (!images || images.length === 0) {
      // Return a placeholder image URL
      return 'https://via.placeholder.com/300x300/cccccc/666666?text=No+Image';
    }

    // Sort by size preference: prefer images around 300px width
    const sortedImages = images
      .filter(img => img.width && img.height) // Only images with dimensions
      .sort((a, b) => {
        const aDistance = Math.abs((a.width || 0) - 300);
        const bDistance = Math.abs((b.width || 0) - 300);
        return aDistance - bDistance;
      });

    // Return the best match, or the first image if no dimensions available
    return sortedImages.length > 0 ? sortedImages[0].url : images[0].url;
  }

  /**
   * Extract genres from Spotify album data
   * Spotify albums don't always have genres, so we'll try to get them from artists
   */
  private static extractGenres(spotifyAlbum: SpotifyAlbum): string[] {
    // Try album genres first
    if (spotifyAlbum.genres && spotifyAlbum.genres.length > 0) {
      return spotifyAlbum.genres;
    }

    // If no album genres, try to get from artists (if available)
    // Note: Basic album objects from search don't include artist genres
    // This would require additional API calls to get full artist data
    
    // For now, return default genres based on album type or use a fallback
    const defaultGenres = ['Music']; // Generic fallback
    
    // You could enhance this by making additional API calls to get artist details
    // or by using the album's market/popularity to infer likely genres
    
    return defaultGenres;
  }

  /**
   * Convert milliseconds to seconds
   */
  private static msToSeconds(ms: number): number {
    return Math.round(ms / 1000);
  }

  /**
   * Convert Spotify track to our Track interface
   */
  static mapSpotifyTrackToTrack(spotifyTrack: SpotifyTrack): Track {
    return {
      id: spotifyTrack.id,
      trackNumber: spotifyTrack.track_number,
      title: spotifyTrack.name,
      duration: SpotifyMapper.msToSeconds(spotifyTrack.duration_ms),
      artist: spotifyTrack.artists.length > 1 
        ? spotifyTrack.artists.slice(1).map(a => a.name).join(', ') // Featured artists
        : undefined,
    };
  }

  /**
   * Convert Spotify album to our Album interface
   */
  static mapSpotifyAlbumToAlbum(spotifyAlbum: SpotifyAlbum): Album {
    // Convert tracks if available
    const trackList: Track[] = spotifyAlbum.tracks?.items
      ? spotifyAlbum.tracks.items.map(track => SpotifyMapper.mapSpotifyTrackToTrack(track))
      : [];

    return {
      id: spotifyAlbum.id,
      title: spotifyAlbum.name,
      artist: spotifyAlbum.artists.map(artist => artist.name).join(', '),
      artistId: spotifyAlbum.artists[0]?.id, // Primary artist ID
      releaseDate: spotifyAlbum.release_date,
      genre: SpotifyMapper.extractGenres(spotifyAlbum),
      coverImageUrl: SpotifyMapper.getBestImageUrl(spotifyAlbum.images),
      trackList,
      description: SpotifyMapper.generateAlbumDescription(spotifyAlbum),
      externalIds: {
        spotify: spotifyAlbum.id,
        // We could add other service IDs here in the future
      },
    };
  }

  /**
   * Generate a description for the album based on Spotify data
   */
  private static generateAlbumDescription(spotifyAlbum: SpotifyAlbum): string {
    const parts: string[] = [];
    
    // Album type and year
    const albumType = spotifyAlbum.album_type.charAt(0).toUpperCase() + spotifyAlbum.album_type.slice(1);
    const releaseYear = new Date(spotifyAlbum.release_date).getFullYear();
    parts.push(`${albumType} released in ${releaseYear}`);
    
    // Track count
    parts.push(`${spotifyAlbum.total_tracks} track${spotifyAlbum.total_tracks !== 1 ? 's' : ''}`);
    
    // Label if available
    if (spotifyAlbum.label) {
      parts.push(`Released by ${spotifyAlbum.label}`);
    }
    
    // Artists
    if (spotifyAlbum.artists.length > 1) {
      parts.push(`Collaboration between ${spotifyAlbum.artists.map(a => a.name).join(', ')}`);
    }
    
    return parts.join(' • ');
  }

  /**
   * Convert Spotify search response to our SearchResult interface
   */
  static mapSpotifySearchToSearchResult(spotifySearch: SpotifySearchResponse): SearchResult {
    const albums: Album[] = spotifySearch.albums?.items
      ? spotifySearch.albums.items.map(album => SpotifyMapper.mapSpotifyAlbumToAlbum(album))
      : [];

    // Extract unique artists from albums
    const artistsSet = new Set<string>();
    albums.forEach(album => {
      album.artist.split(', ').forEach(artist => artistsSet.add(artist.trim()));
    });
    const artists = Array.from(artistsSet);

    return {
      albums,
      artists,
      totalResults: spotifySearch.albums?.total || 0,
    };
  }

  /**
   * Create a fallback album for when Spotify data is unavailable
   */
  static createFallbackAlbum(id: string, title: string, artist: string): Album {
    return {
      id,
      title,
      artist,
      releaseDate: new Date().toISOString().split('T')[0], // Today's date
      genre: ['Unknown'],
      coverImageUrl: 'https://via.placeholder.com/300x300/cccccc/666666?text=No+Image',
      trackList: [],
      description: 'Album information unavailable',
      externalIds: {},
    };
  }

  /**
   * Enhance album data by fetching full track listing
   * This is useful when search results don't include complete track data
   */
  static async enhanceAlbumWithTracks(
    album: Album,
    getFullAlbumData: (spotifyId: string) => Promise<SpotifyAlbum>
  ): Promise<Album> {
    if (!album.externalIds.spotify || album.trackList.length > 0) {
      return album; // Already has tracks or no Spotify ID
    }

    try {
      const fullSpotifyAlbum = await getFullAlbumData(album.externalIds.spotify);
      return SpotifyMapper.mapSpotifyAlbumToAlbum(fullSpotifyAlbum);
    } catch (error) {
      console.warn('Failed to enhance album with tracks:', error);
      return album; // Return original album if enhancement fails
    }
  }

  /**
   * Validate that a Spotify album has minimum required data
   */
  static isValidSpotifyAlbum(spotifyAlbum: SpotifyAlbum): boolean {
    return !!(
      spotifyAlbum.id &&
      spotifyAlbum.name &&
      spotifyAlbum.artists &&
      spotifyAlbum.artists.length > 0 &&
      spotifyAlbum.images &&
      spotifyAlbum.images.length > 0
    );
  }

  /**
   * Clean up album title by removing common suffixes and formatting issues
   */
  static cleanAlbumTitle(title: string): string {
    return title
      .replace(/\s*\(Deluxe Edition\)/gi, '')
      .replace(/\s*\(Expanded Edition\)/gi, '')
      .replace(/\s*\(Remastered\)/gi, '')
      .replace(/\s*\(Explicit\)/gi, '')
      .trim();
  }

  /**
   * Get album popularity score (0-100) if available
   */
  static getAlbumPopularity(spotifyAlbum: SpotifyAlbum): number {
    return spotifyAlbum.popularity || 0;
  }

  /**
   * Map Spotify album to database album format
   */
  static mapAlbumToDatabase(spotifyAlbum: SpotifyAlbum) {
    return {
      id: spotifyAlbum.id,
      name: spotifyAlbum.name,
      artist_name: spotifyAlbum.artists.map(artist => artist.name).join(', '),
      artist_id: spotifyAlbum.artists[0]?.id || null, // Primary artist ID
      release_date: spotifyAlbum.release_date || null,
      image_url: this.getBestImageUrl(spotifyAlbum.images),
      spotify_url: spotifyAlbum.external_urls?.spotify || null,
      total_tracks: spotifyAlbum.total_tracks || null,
      album_type: spotifyAlbum.album_type || 'album',
      genres: this.extractGenres(spotifyAlbum),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Convert Spotify artist to our Artist interface
   */
  static mapSpotifyArtistToArtist(spotifyArtist: SpotifyArtistFull): Artist {
    return {
      id: spotifyArtist.id,
      name: spotifyArtist.name,
      imageUrl: this.getBestImageUrl(spotifyArtist.images || []),
      genres: spotifyArtist.genres || [],
      spotifyUrl: spotifyArtist.external_urls?.spotify,
      followerCount: spotifyArtist.followers?.total,
      popularity: spotifyArtist.popularity,
    };
  }

  /**
   * Map Spotify artist to database artist format
   */
  static mapArtistToDatabase(spotifyArtist: SpotifyArtistFull) {
    return {
      id: spotifyArtist.id,
      name: spotifyArtist.name,
      image_url: this.getBestImageUrl(spotifyArtist.images || []),
      spotify_url: spotifyArtist.external_urls?.spotify || null,
      genres: spotifyArtist.genres || [],
      follower_count: spotifyArtist.followers?.total || null,
      popularity: spotifyArtist.popularity || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Validate that a Spotify artist has minimum required data
   */
  static isValidSpotifyArtist(spotifyArtist: SpotifyArtistFull): boolean {
    return !!(
      spotifyArtist.id &&
      spotifyArtist.name &&
      spotifyArtist.images &&
      spotifyArtist.images.length > 0
    );
  }
}