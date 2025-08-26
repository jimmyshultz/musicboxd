import { supabase } from './supabase';

export interface FavoriteAlbum {
  id: string;
  user_id: string;
  album_id: string;
  favorited_at: string;
  created_at: string;
  updated_at: string;
}

export interface FavoriteAlbumWithAlbum extends FavoriteAlbum {
  albums: {
    id: string;
    name: string;
    artist_name: string;
    release_date?: string;
    image_url?: string;
    spotify_url?: string;
    total_tracks?: number;
    album_type?: string;
    genres?: string[];
  };
}

class FavoriteAlbumsService {
  /**
   * Add an album to user's favorites
   */
  async addToFavorites(userId: string, albumId: string): Promise<FavoriteAlbum> {
    try {
      // First, ensure the album exists in the albums table
      await this.ensureAlbumExists(albumId);

      const { data, error } = await supabase
        .from('favorite_albums')
        .insert({
          user_id: userId,
          album_id: albumId,
          favorited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error adding album to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove an album from user's favorites
   */
  async removeFromFavorites(userId: string, albumId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('favorite_albums')
        .delete()
        .eq('user_id', userId)
        .eq('album_id', albumId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error removing album from favorites:', error);
      throw error;
    }
  }

  /**
   * Check if an album is in user's favorites
   */
  async isAlbumFavorited(userId: string, albumId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('favorite_albums')
        .select('id')
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking if album is favorited:', error);
      return false;
    }
  }

  /**
   * Get user's favorite albums with album details
   */
  async getUserFavoriteAlbums(userId: string, limit: number = 50, offset: number = 0): Promise<FavoriteAlbumWithAlbum[]> {
    try {
      const { data, error } = await supabase
        .from('favorite_albums')
        .select(`
          *,
          albums (*)
        `)
        .eq('user_id', userId)
        .order('favorited_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user favorite albums:', error);
      throw error;
    }
  }

  /**
   * Get count of albums user has favorited
   */
  async getUserFavoriteCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('favorite_albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting user favorite count:', error);
      return 0;
    }
  }

  /**
   * Get user's favorite status for multiple albums
   */
  async getUserAlbumFavoriteStatus(userId: string, albumIds: string[]): Promise<Record<string, boolean>> {
    try {
      if (albumIds.length === 0) {
        return {};
      }

      const { data, error } = await supabase
        .from('favorite_albums')
        .select('album_id')
        .eq('user_id', userId)
        .in('album_id', albumIds);

      if (error) {
        throw error;
      }

      const statusMap: Record<string, boolean> = {};
      albumIds.forEach(id => {
        statusMap[id] = false;
      });
      data?.forEach(item => {
        statusMap[item.album_id] = true;
      });

      return statusMap;
    } catch (error) {
      console.error('Error getting user album favorite status:', error);
      return {};
    }
  }

  /**
   * Get most favorited albums (for discovery)
   */
  async getMostFavoritedAlbums(limit: number = 20): Promise<{ album_id: string; favorite_count: number; albums: any }[]> {
    try {
      const { data, error } = await supabase
        .from('favorite_albums')
        .select(`
          album_id,
          albums (*)
        `)
        .limit(limit);

      if (error) {
        throw error;
      }

      // Group by album and count favorites
      const albumCounts: Record<string, { count: number; album: any }> = {};
      data?.forEach(item => {
        if (albumCounts[item.album_id]) {
          albumCounts[item.album_id].count++;
        } else {
          albumCounts[item.album_id] = {
            count: 1,
            album: item.albums
          };
        }
      });

      // Convert to array and sort by count
      return Object.entries(albumCounts)
        .map(([album_id, { count, album }]) => ({
          album_id,
          favorite_count: count,
          albums: album
        }))
        .sort((a, b) => b.favorite_count - a.favorite_count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting most favorited albums:', error);
      return [];
    }
  }

  /**
   * Ensure an album exists in the albums table
   */
  private async ensureAlbumExists(albumId: string): Promise<void> {
    try {
      // Check if album already exists
      const { data: existingAlbum, error: checkError } = await supabase
        .from('albums')
        .select('id')
        .eq('id', albumId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingAlbum) {
        // Album already exists
        return;
      }

      // Album doesn't exist, we need to fetch it and insert it
      const { AlbumService } = await import('./albumService');
      const albumResponse = await AlbumService.getAlbumById(albumId);
      
      if (!albumResponse.success || !albumResponse.data) {
        throw new Error(`Could not fetch album data for ID: ${albumId}`);
      }

      const album = albumResponse.data;
      
      // Insert the album into the database
      const { error: insertError } = await supabase
        .from('albums')
        .insert({
          id: album.id,
          name: album.title,
          artist_name: album.artist,
          release_date: album.releaseDate || null,
          image_url: album.coverImageUrl || null,
          spotify_url: album.spotifyUrl || null,
          total_tracks: album.totalTracks || null,
          album_type: album.albumType || 'album',
          genres: album.genre || []
        });

      if (insertError) {
        throw insertError;
      }
    } catch (error) {
      console.error('Error ensuring album exists:', error);
      throw error;
    }
  }
}

export const favoriteAlbumsService = new FavoriteAlbumsService();