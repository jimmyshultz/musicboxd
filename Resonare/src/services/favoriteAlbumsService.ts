import { supabase } from './supabase';

export interface FavoriteAlbum {
  id: string;
  user_id: string;
  album_id: string;
  ranking: number; // 1-5 ranking
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
   * Add an album to user's favorites with a specific ranking
   */
  async addToFavorites(userId: string, albumId: string, ranking: number): Promise<FavoriteAlbum> {
    try {
      // Validate ranking
      if (ranking < 1 || ranking > 5) {
        throw new Error('Ranking must be between 1 and 5');
      }

      // First, ensure the album exists in the albums table
      await this.ensureAlbumExists(albumId);

      const { data, error } = await supabase
        .from('favorite_albums')
        .insert({
          user_id: userId,
          album_id: albumId,
          ranking: ranking,
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
   * Update the ranking of a favorite album
   */
  async updateFavoriteRanking(userId: string, albumId: string, newRanking: number): Promise<FavoriteAlbum> {
    try {
      // Validate ranking
      if (newRanking < 1 || newRanking > 5) {
        throw new Error('Ranking must be between 1 and 5');
      }

      const { data, error } = await supabase
        .from('favorite_albums')
        .update({
          ranking: newRanking,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating favorite ranking:', error);
      throw error;
    }
  }

  /**
   * Set user's complete favorite albums list with rankings
   * This replaces all existing favorites
   */
  async setUserFavorites(userId: string, favorites: { albumId: string; ranking: number }[]): Promise<FavoriteAlbum[]> {
    try {
      // Validate all rankings
      for (const fav of favorites) {
        if (fav.ranking < 1 || fav.ranking > 5) {
          throw new Error('All rankings must be between 1 and 5');
        }
      }

      // Check for duplicate rankings
      const rankings = favorites.map(f => f.ranking);
      if (new Set(rankings).size !== rankings.length) {
        throw new Error('Each ranking position (1-5) can only be used once');
      }

      // Ensure all albums exist
      await Promise.all(favorites.map(fav => this.ensureAlbumExists(fav.albumId)));

      // Delete existing favorites
      await supabase
        .from('favorite_albums')
        .delete()
        .eq('user_id', userId);

      // Insert new favorites if any provided
      if (favorites.length > 0) {
        const { data, error } = await supabase
          .from('favorite_albums')
          .insert(
            favorites.map(fav => ({
              user_id: userId,
              album_id: fav.albumId,
              ranking: fav.ranking,
              favorited_at: new Date().toISOString(),
            }))
          )
          .select();

        if (error) {
          throw error;
        }

        return data || [];
      }

      return [];
    } catch (error) {
      console.error('Error setting user favorites:', error);
      throw error;
    }
  }

  /**
   * Reorder user's favorites by moving an album to a new position
   * This handles the complex logic of shifting other albums
   */
  async reorderFavorites(userId: string, albumId: string, newRanking: number): Promise<FavoriteAlbum[]> {
    try {
      if (newRanking < 1 || newRanking > 5) {
        throw new Error('Ranking must be between 1 and 5');
      }

      // Get current favorites
      const currentFavorites = await this.getUserFavoriteAlbums(userId);
      
      // Find the album being moved
      const albumIndex = currentFavorites.findIndex(fav => fav.album_id === albumId);
      if (albumIndex === -1) {
        throw new Error('Album not found in favorites');
      }

      // Create new ordering
      const reorderedFavorites = [...currentFavorites];
      const [movedAlbum] = reorderedFavorites.splice(albumIndex, 1);
      reorderedFavorites.splice(newRanking - 1, 0, movedAlbum);

      // Update rankings
      const newFavorites = reorderedFavorites.map((fav, index) => ({
        albumId: fav.album_id,
        ranking: index + 1
      }));

      // Apply the new order
      return await this.setUserFavorites(userId, newFavorites);
    } catch (error) {
      console.error('Error reordering favorites:', error);
      throw error;
    }
  }

  /**
   * Remove an album from user's favorites and reorder remaining albums
   */
  async removeFromFavorites(userId: string, albumId: string): Promise<void> {
    try {
      // Get current favorites
      const currentFavorites = await this.getUserFavoriteAlbums(userId);
      
      // Filter out the album to remove
      const remainingFavorites = currentFavorites
        .filter(fav => fav.album_id !== albumId)
        .map((fav, index) => ({
          albumId: fav.album_id,
          ranking: index + 1  // Recompute rankings 1, 2, 3, etc.
        }));

      // Apply the new order (this will delete and recreate all)
      await this.setUserFavorites(userId, remainingFavorites);
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
   * Get user's favorite albums with album details, ordered by ranking
   */
  async getUserFavoriteAlbums(userId: string, limit: number = 5): Promise<FavoriteAlbumWithAlbum[]> {
    try {
      const { data, error } = await supabase
        .from('favorite_albums')
        .select(`
          *,
          albums (*)
        `)
        .eq('user_id', userId)
        .order('ranking', { ascending: true }) // Order by ranking 1-5
        .limit(limit);

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
   * Get user's favorite album for a specific ranking position
   */
  async getUserFavoriteByRanking(userId: string, ranking: number): Promise<FavoriteAlbumWithAlbum | null> {
    try {
      if (ranking < 1 || ranking > 5) {
        throw new Error('Ranking must be between 1 and 5');
      }

      const { data, error } = await supabase
        .from('favorite_albums')
        .select(`
          *,
          albums (*)
        `)
        .eq('user_id', userId)
        .eq('ranking', ranking)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting user favorite by ranking:', error);
      return null;
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