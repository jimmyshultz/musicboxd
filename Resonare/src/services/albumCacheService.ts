import { supabase } from './supabase';
import { SpotifyService } from './spotifyService';
import { SpotifyMapper } from './spotifyMapper';

/**
 * Centralized service for ensuring albums exist in the database
 * with in-memory caching to reduce redundant database queries
 */
class AlbumCacheService {
  private verifiedAlbums = new Map<string, number>(); // albumId -> timestamp
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Ensure an album exists in the albums table
   * Uses in-memory cache to avoid repeated database checks
   */
  async ensureAlbumExists(albumId: string): Promise<void> {
    try {
      // Check in-memory cache first
      const cached = this.verifiedAlbums.get(albumId);
      if (cached && Date.now() - cached < this.CACHE_TTL_MS) {
        return; // Recently verified, skip DB check
      }

      // Check database
      const { data, error } = await supabase
        .from('albums')
        .select('id')
        .eq('id', albumId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Album exists, cache and return
        this.verifiedAlbums.set(albumId, Date.now());
        return;
      }

      // Album doesn't exist, fetch from Spotify and insert
      const spotifyAlbum = await SpotifyService.getAlbum(albumId);
      const dbAlbum = SpotifyMapper.mapAlbumToDatabase(spotifyAlbum);

      const { error: insertError } = await supabase
        .from('albums')
        .insert(dbAlbum);

      if (insertError) {
        throw insertError;
      }

      // Cache successful insert
      this.verifiedAlbums.set(albumId, Date.now());
    } catch (error) {
      console.error('Error ensuring album exists:', error);
      throw error;
    }
  }

  /**
   * Clear the in-memory cache
   * Useful for testing or when cache needs to be invalidated
   */
  clearCache(): void {
    this.verifiedAlbums.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; ttlMs: number } {
    return {
      size: this.verifiedAlbums.size,
      ttlMs: this.CACHE_TTL_MS,
    };
  }
}

export const albumCacheService = new AlbumCacheService();

