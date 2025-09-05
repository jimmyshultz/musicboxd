import { supabase } from './supabase';

export interface AlbumListen {
  id: string;
  user_id: string;
  album_id: string;
  is_listened: boolean;
  first_listened_at: string;
  created_at: string;
  updated_at: string;
}

export interface AlbumListenWithAlbum extends AlbumListen {
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

class AlbumListensService {
  /**
   * Mark an album as listened for a user
   */
  async markAsListened(userId: string, albumId: string): Promise<AlbumListen> {
    try {
      // First, ensure the album exists in the albums table
      await this.ensureAlbumExists(albumId);

      const { data, error } = await supabase
        .from('album_listens')
        .upsert({
          user_id: userId,
          album_id: albumId,
          is_listened: true,
          first_listened_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,album_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error marking album as listened:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
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

  /**
   * Unmark an album as listened for a user
   */
  async unmarkAsListened(userId: string, albumId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('album_listens')
        .delete()
        .eq('user_id', userId)
        .eq('album_id', albumId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error unmarking album as listened:', error);
      throw error;
    }
  }

  /**
   * Check if user has listened to an album
   */
  async hasUserListenedToAlbum(userId: string, albumId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('album_listens')
        .select('is_listened')
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data?.is_listened || false;
    } catch (error) {
      console.error('Error checking if user listened to album:', error);
      return false;
    }
  }

  /**
   * Get user's listened albums with album details
   */
  async getUserListenedAlbums(userId: string, limit: number = 50, offset: number = 0): Promise<AlbumListenWithAlbum[]> {
    try {
      const { data, error } = await supabase
        .from('album_listens')
        .select(`
          *,
          albums (*)
        `)
        .eq('user_id', userId)
        .eq('is_listened', true)
        .order('first_listened_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user listened albums:', error);
      throw error;
    }
  }

  /**
   * Get count of albums user has listened to
   */
  async getUserListenCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('album_listens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_listened', true);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting user listen count:', error);
      return 0;
    }
  }

  /**
   * Get count of albums user has listened to this year
   */
  async getUserListenCountThisYear(userId: string): Promise<number> {
    try {
      const currentYear = new Date().getFullYear();
      
      const { count, error } = await supabase
        .from('album_listens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_listened', true)
        .gte('first_listened_at', `${currentYear}-01-01T00:00:00.000Z`)
        .lt('first_listened_at', `${currentYear + 1}-01-01T00:00:00.000Z`);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting user listen count this year:', error);
      return 0;
    }
  }

  /**
   * Get user's album listen status for multiple albums
   */
  async getUserAlbumListenStatus(userId: string, albumIds: string[]): Promise<Record<string, boolean>> {
    try {
      if (albumIds.length === 0) {
        return {};
      }

      const { data, error } = await supabase
        .from('album_listens')
        .select('album_id, is_listened')
        .eq('user_id', userId)
        .in('album_id', albumIds);

      if (error) {
        throw error;
      }

      const statusMap: Record<string, boolean> = {};
      data?.forEach(item => {
        statusMap[item.album_id] = item.is_listened;
      });

      return statusMap;
    } catch (error) {
      console.error('Error getting user album listen status:', error);
      return {};
    }
  }

  /**
   * Get all listens for a user with album details
   */
  async getUserListensWithAlbums(userId: string): Promise<AlbumListenWithAlbum[]> {
    try {
      const { data, error } = await supabase
        .from('album_listens')
        .select(`
          *,
          albums (
            id,
            name,
            artist_name,
            release_date,
            image_url,
            spotify_url,
            total_tracks,
            album_type,
            genres
          )
        `)
        .eq('user_id', userId)
        .eq('is_listened', true)
        .order('first_listened_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user listens with albums:', error);
      return [];
    }
  }
}

export const albumListensService = new AlbumListensService();