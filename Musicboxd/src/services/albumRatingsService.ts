import { supabase } from './supabase';

export interface AlbumRating {
  id: string;
  user_id: string;
  album_id: string;
  rating: number;
  review?: string;
  created_at: string;
  updated_at: string;
}

export interface AlbumRatingWithAlbum extends AlbumRating {
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

class AlbumRatingsService {
  /**
   * Rate an album for a user
   */
  async rateAlbum(userId: string, albumId: string, rating: number, review?: string): Promise<AlbumRating> {
    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // First, ensure the album exists in the albums table
      await this.ensureAlbumExists(albumId);

      const { data, error } = await supabase
        .from('album_ratings')
        .upsert({
          user_id: userId,
          album_id: albumId,
          rating: rating,
          review: review || null,
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
      console.error('Error rating album:', error);
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
   * Remove rating from an album for a user
   */
  async removeRating(userId: string, albumId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('album_ratings')
        .delete()
        .eq('user_id', userId)
        .eq('album_id', albumId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error removing rating:', error);
      throw error;
    }
  }

  /**
   * Get user's rating for a specific album
   */
  async getUserAlbumRating(userId: string, albumId: string): Promise<AlbumRating | null> {
    try {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('*')
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting user album rating:', error);
      return null;
    }
  }

  /**
   * Get user's rated albums with album details
   */
  async getUserRatedAlbums(userId: string, limit: number = 50, offset: number = 0): Promise<AlbumRatingWithAlbum[]> {
    try {
      const { data, error } = await supabase
        .from('album_ratings')
        .select(`
          *,
          albums (*)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user rated albums:', error);
      throw error;
    }
  }

  /**
   * Get count of albums user has rated
   */
  async getUserRatingCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('album_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting user rating count:', error);
      return 0;
    }
  }

  /**
   * Get count of albums user has rated this year
   */
  async getUserRatingCountThisYear(userId: string): Promise<number> {
    try {
      const currentYear = new Date().getFullYear();
      
      const { count, error } = await supabase
        .from('album_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('updated_at', `${currentYear}-01-01T00:00:00.000Z`)
        .lt('updated_at', `${currentYear + 1}-01-01T00:00:00.000Z`);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting user rating count this year:', error);
      return 0;
    }
  }

  /**
   * Get user's average rating
   */
  async getUserAverageRating(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('album_ratings')
        .select('rating')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      const sum = data.reduce((total, item) => total + item.rating, 0);
      return Math.round((sum / data.length) * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      console.error('Error getting user average rating:', error);
      return 0;
    }
  }

  /**
   * Get user's album ratings for multiple albums
   */
  async getUserAlbumRatings(userId: string, albumIds: string[]): Promise<Record<string, AlbumRating>> {
    try {
      if (albumIds.length === 0) {
        return {};
      }

      const { data, error } = await supabase
        .from('album_ratings')
        .select('*')
        .eq('user_id', userId)
        .in('album_id', albumIds);

      if (error) {
        throw error;
      }

      const ratingsMap: Record<string, AlbumRating> = {};
      data?.forEach(rating => {
        ratingsMap[rating.album_id] = rating;
      });

      return ratingsMap;
    } catch (error) {
      console.error('Error getting user album ratings:', error);
      return {};
    }
  }
}

export const albumRatingsService = new AlbumRatingsService();