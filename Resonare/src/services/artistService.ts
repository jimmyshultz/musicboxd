import { Artist, Album, ApiResponse } from '../types';
import { TableNames } from '../types/database';
import { SpotifyService } from './spotifyService';
import { SpotifyMapper } from './spotifyMapper';
import { supabase } from './supabase';

export class ArtistService {
  /**
   * Helper method to convert database artist to app Artist format
   */
  private static mapDatabaseArtistToApp(dbArtist: any): Artist {
    return {
      id: dbArtist.id,
      name: dbArtist.name,
      imageUrl: dbArtist.image_url || '',
      genres: dbArtist.genres || [],
      spotifyUrl: dbArtist.spotify_url,
      followerCount: dbArtist.follower_count,
      popularity: dbArtist.popularity,
    };
  }

  /**
   * Helper method to convert database album to app Album format
   */
  private static mapDatabaseAlbumToApp(dbAlbum: any): Album {
    return {
      id: dbAlbum.id,
      title: dbAlbum.name,
      artist: dbAlbum.artist_name,
      artistId: dbAlbum.artist_id,
      releaseDate: dbAlbum.release_date || '',
      genre: dbAlbum.genres || [],
      coverImageUrl: dbAlbum.image_url || '',
      trackList: [], // Empty for now
      externalIds: {
        spotify: dbAlbum.id,
      },
    };
  }

  /**
   * Get artist by ID
   * First checks database, then fetches from Spotify if needed
   */
  static async getArtistById(artistId: string): Promise<ApiResponse<Artist | null>> {
    try {
      // Check database first
      const { data: dbArtist, error: dbError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();

      if (dbArtist && !dbError) {
        return {
          data: this.mapDatabaseArtistToApp(dbArtist),
          success: true,
          message: 'Artist found in database',
        };
      }

      // Fetch from Spotify if not in database
      if (SpotifyService.isConfigured()) {
        try {
          const spotifyArtist = await SpotifyService.getArtist(artistId);
          
          if (SpotifyMapper.isValidSpotifyArtist(spotifyArtist)) {
            const artist = SpotifyMapper.mapSpotifyArtistToArtist(spotifyArtist);

            // Store in database for future requests
            const dbFormat = SpotifyMapper.mapArtistToDatabase(spotifyArtist);
            await supabase.from('artists').upsert(dbFormat);

            return {
              data: artist,
              success: true,
              message: 'Artist found on Spotify',
            };
          }
        } catch (spotifyError) {
          console.error('Error fetching artist from Spotify:', spotifyError);
        }
      }

      return {
        data: null,
        success: false,
        message: 'Artist not found',
      };
    } catch (error) {
      console.error('Error in getArtistById:', error);
      return {
        data: null,
        success: false,
        message: 'Error fetching artist',
      };
    }
  }

  /**
   * Get all albums by an artist
   * First checks database, then fetches from Spotify if needed
   */
  static async getArtistAlbums(
    artistId: string,
    options?: { includeGroups?: string; limit?: number }
  ): Promise<ApiResponse<Album[]>> {
    try {
      // Query database for albums by this artist
      const { data: dbAlbums, error: dbError } = await supabase
        .from('albums')
        .select('*')
        .eq('artist_id', artistId)
        .order('release_date', { ascending: false });

      // If we have cached albums, return them
      if (dbAlbums && dbAlbums.length > 0 && !dbError) {
        const albums = dbAlbums.map(this.mapDatabaseAlbumToApp);
        return {
          data: albums,
          success: true,
          message: `Found ${albums.length} albums in database`,
        };
      }

      // Fetch from Spotify if no cached albums
      if (SpotifyService.isConfigured()) {
        try {
          const spotifyResponse = await SpotifyService.getArtistAlbums(artistId, {
            include_groups: options?.includeGroups || 'album,single',
            limit: options?.limit || 50,
          });

          const albums: Album[] = [];

          // Process and store each album
          for (const spotifyAlbum of spotifyResponse.items) {
            const album = SpotifyMapper.mapSpotifyAlbumToAlbum(spotifyAlbum);
            albums.push(album);

            // Store in database
            const dbFormat = SpotifyMapper.mapAlbumToDatabase(spotifyAlbum);
            await supabase.from('albums').upsert(dbFormat);
          }

          // Also store/update the artist info if we're fetching their albums
          try {
            const spotifyArtist = await SpotifyService.getArtist(artistId);
            const dbArtistFormat = SpotifyMapper.mapArtistToDatabase(spotifyArtist);
            await supabase.from('artists').upsert(dbArtistFormat);
          } catch (artistError) {
            // Don't fail if artist update fails
            console.warn('Could not update artist info:', artistError);
          }

          return {
            data: albums,
            success: true,
            message: `Found ${albums.length} albums on Spotify`,
          };
        } catch (spotifyError) {
          console.error('Error fetching albums from Spotify:', spotifyError);
        }
      }

      return {
        data: [],
        success: true,
        message: 'No albums found',
      };
    } catch (error) {
      console.error('Error in getArtistAlbums:', error);
      return {
        data: [],
        success: false,
        message: 'Error fetching albums',
      };
    }
  }

  /**
   * Search for artists by name
   * Useful for finding artist ID when only name is available
   */
  static async searchArtistByName(name: string): Promise<ApiResponse<Artist | null>> {
    try {
      if (!name.trim()) {
        return {
          data: null,
          success: false,
          message: 'Empty search query',
        };
      }

      // Check if Spotify is configured
      if (!SpotifyService.isConfigured()) {
        return {
          data: null,
          success: false,
          message: 'Spotify not configured',
        };
      }

      // Search Spotify for artists
      const spotifyResponse = await SpotifyService.searchArtists(name, 1); // Get top result
      
      if (!spotifyResponse.artists?.items || spotifyResponse.artists.items.length === 0) {
        return {
          data: null,
          success: false,
          message: 'No artists found',
        };
      }

      // Get the first (most relevant) result
      const spotifyArtist = spotifyResponse.artists.items[0];
      
      if (!SpotifyMapper.isValidSpotifyArtist(spotifyArtist)) {
        return {
          data: null,
          success: false,
          message: 'Invalid artist data',
        };
      }

      const artist = SpotifyMapper.mapSpotifyArtistToArtist(spotifyArtist);

      // Store in database for future requests
      const dbFormat = SpotifyMapper.mapArtistToDatabase(spotifyArtist);
      await supabase.from('artists').upsert(dbFormat);

      return {
        data: artist,
        success: true,
        message: 'Artist found',
      };
    } catch (error) {
      console.error('Error searching for artist:', error);
      return {
        data: null,
        success: false,
        message: 'Error searching for artist',
      };
    }
  }

  /**
   * Get or fetch artist by name
   * First searches database, then falls back to Spotify search
   * Useful for legacy data migration or when only artist name is available
   */
  static async getOrFetchArtistByName(name: string): Promise<Artist | null> {
    try {
      // Check database first
      const { data: dbArtists, error: dbError } = await supabase
        .from('artists')
        .select('*')
        .ilike('name', name)
        .limit(1);

      if (dbArtists && dbArtists.length > 0 && !dbError) {
        return this.mapDatabaseArtistToApp(dbArtists[0]);
      }

      // Search Spotify as fallback
      const searchResult = await this.searchArtistByName(name);
      return searchResult.data;
    } catch (error) {
      console.error('Error in getOrFetchArtistByName:', error);
      return null;
    }
  }

  /**
   * Search for multiple artists
   * Returns a list of artists matching the search query
   */
  static async searchArtists(query: string, limit: number = 20): Promise<ApiResponse<Artist[]>> {
    try {
      if (!query.trim()) {
        return {
          data: [],
          success: false,
          message: 'Empty search query',
        };
      }

      // Check if Spotify is configured
      if (!SpotifyService.isConfigured()) {
        return {
          data: [],
          success: false,
          message: 'Spotify not configured',
        };
      }

      // Search Spotify for artists
      const spotifyResponse = await SpotifyService.searchArtists(query, limit);
      
      if (!spotifyResponse.artists?.items || spotifyResponse.artists.items.length === 0) {
        return {
          data: [],
          success: true,
          message: 'No artists found',
        };
      }

      // Map and filter valid artists
      const artists: Artist[] = [];
      
      for (const spotifyArtist of spotifyResponse.artists.items) {
        if (SpotifyMapper.isValidSpotifyArtist(spotifyArtist)) {
          const artist = SpotifyMapper.mapSpotifyArtistToArtist(spotifyArtist);
          artists.push(artist);

          // Optionally store in database for future requests (non-blocking)
          const dbFormat = SpotifyMapper.mapArtistToDatabase(spotifyArtist);
          supabase
            .from(TableNames.ARTISTS)
            .upsert(dbFormat, { onConflict: 'id' })
            .then(({ error }) => {
              if (error) {
                console.warn('Failed to cache artist in database:', error);
              }
            });
        }
      }

      return {
        data: artists,
        success: true,
        message: `Found ${artists.length} artists`,
      };
    } catch (error) {
      console.error('Error searching artists:', error);
      return {
        data: [],
        success: false,
        message: error instanceof Error ? error.message : 'Failed to search artists',
      };
    }
  }

  /**
   * Batch fetch artists by IDs
   * Useful for getting multiple artists at once
   */
  static async getArtistsByIds(artistIds: string[]): Promise<Artist[]> {
    try {
      if (artistIds.length === 0) {
        return [];
      }

      // Get from database
      const { data: dbArtists, error: dbError } = await supabase
        .from('artists')
        .select('*')
        .in('id', artistIds);

      if (dbError) {
        console.error('Error fetching artists:', dbError);
        return [];
      }

      // Find which artists are missing from database
      const foundIds = new Set(dbArtists?.map(a => a.id) || []);
      const missingIds = artistIds.filter(id => !foundIds.has(id));

      // Fetch missing artists from Spotify
      const fetchedArtists: Artist[] = [];
      for (const artistId of missingIds) {
        const result = await this.getArtistById(artistId);
        if (result.success && result.data) {
          fetchedArtists.push(result.data);
        }
      }

      // Combine database and fetched artists
      const allArtists = [
        ...(dbArtists?.map(this.mapDatabaseArtistToApp) || []),
        ...fetchedArtists,
      ];

      return allArtists;
    } catch (error) {
      console.error('Error in getArtistsByIds:', error);
      return [];
    }
  }
}

