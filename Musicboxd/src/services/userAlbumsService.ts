import { supabase } from './supabase';
import { SpotifyService } from './spotifyService';
import { SpotifyMapper } from './spotifyMapper';

export interface UserAlbumInteraction {
  id: string;
  user_id: string;
  album_id: string;
  rating?: number;
  is_listened: boolean;
  listened_at?: string;
  review?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAlbumStats {
  totalAlbums: number;
  totalRatings: number;
  averageRating: number;
  albumsThisYear: number;
  ratingsThisYear: number;
}

export interface AlbumWithInteraction {
  id: string;
  name: string;
  artist_name: string;
  release_date?: string;
  image_url?: string;
  spotify_url?: string;
  total_tracks?: number;
  album_type?: string;
  genres?: string[];
  interaction?: UserAlbumInteraction;
}

class UserAlbumsService {
  /**
   * Ensure album exists in the albums table
   */
  private async ensureAlbumExists(spotifyAlbumId: string): Promise<void> {
    try {
      // Check if album already exists
      const { data: existingAlbum, error: checkError } = await supabase
        .from('albums')
        .select('id')
        .eq('id', spotifyAlbumId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // Error other than "not found"
        throw checkError;
      }

      if (existingAlbum) {
        // Album already exists
        return;
      }

      // Fetch album data from Spotify
      const spotifyAlbum = await SpotifyService.getAlbum(spotifyAlbumId);
      const mappedAlbum = SpotifyMapper.mapAlbumToDatabase(spotifyAlbum);

      // Insert album into database
      const { error: insertError } = await supabase
        .from('albums')
        .insert(mappedAlbum);

      if (insertError) {
        throw insertError;
      }
    } catch (error) {
      console.error('Error ensuring album exists:', error);
      throw error;
    }
  }

  /**
   * Mark an album as listened for a user
   */
  async markAsListened(userId: string, albumId: string, listenedAt?: Date): Promise<UserAlbumInteraction> {
    try {
      // Ensure album exists in database
      await this.ensureAlbumExists(albumId);

      const timestamp = listenedAt || new Date();
      
      const { data, error } = await supabase
        .from('user_albums')
        .upsert({
          user_id: userId,
          album_id: albumId,
          is_listened: true,
          listened_at: timestamp.toISOString(),
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
      throw error;
    }
  }

  /**
   * Unmark an album as listened for a user
   */
  async unmarkAsListened(userId: string, albumId: string): Promise<UserAlbumInteraction> {
    try {
      const { data, error } = await supabase
        .from('user_albums')
        .upsert({
          user_id: userId,
          album_id: albumId,
          is_listened: false,
          listened_at: null,
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
      console.error('Error unmarking album as listened:', error);
      throw error;
    }
  }

  /**
   * Rate an album for a user
   */
  async rateAlbum(userId: string, albumId: string, rating: number): Promise<UserAlbumInteraction> {
    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Ensure album exists in database
      await this.ensureAlbumExists(albumId);

      const { data, error } = await supabase
        .from('user_albums')
        .upsert({
          user_id: userId,
          album_id: albumId,
          rating: rating,
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
   * Remove rating from an album for a user
   */
  async removeRating(userId: string, albumId: string): Promise<UserAlbumInteraction> {
    try {
      const { data, error } = await supabase
        .from('user_albums')
        .upsert({
          user_id: userId,
          album_id: albumId,
          rating: null,
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
      console.error('Error removing rating:', error);
      throw error;
    }
  }

  /**
   * Get user's interaction with a specific album
   */
  async getUserAlbumInteraction(userId: string, albumId: string): Promise<UserAlbumInteraction | null> {
    try {
      const { data, error } = await supabase
        .from('user_albums')
        .select('*')
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting user album interaction:', error);
      throw error;
    }
  }

  /**
   * Get user's listening history (chronological order)
   */
  async getUserListeningHistory(userId: string, limit: number = 50, offset: number = 0): Promise<AlbumWithInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('user_albums')
        .select(`
          *,
          albums (*)
        `)
        .eq('user_id', userId)
        .eq('is_listened', true)
        .order('listened_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data.map(item => ({
        ...item.albums,
        interaction: {
          id: item.id,
          user_id: item.user_id,
          album_id: item.album_id,
          rating: item.rating,
          is_listened: item.is_listened,
          listened_at: item.listened_at,
          review: item.review,
          created_at: item.created_at,
          updated_at: item.updated_at
        }
      }));
    } catch (error) {
      console.error('Error getting user listening history:', error);
      throw error;
    }
  }

  /**
   * Get user's rated albums
   */
  async getUserRatedAlbums(userId: string, limit: number = 50, offset: number = 0): Promise<AlbumWithInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('user_albums')
        .select(`
          *,
          albums (*)
        `)
        .eq('user_id', userId)
        .not('rating', 'is', null)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data.map(item => ({
        ...item.albums,
        interaction: {
          id: item.id,
          user_id: item.user_id,
          album_id: item.album_id,
          rating: item.rating,
          is_listened: item.is_listened,
          listened_at: item.listened_at,
          review: item.review,
          created_at: item.created_at,
          updated_at: item.updated_at
        }
      }));
    } catch (error) {
      console.error('Error getting user rated albums:', error);
      throw error;
    }
  }

  /**
   * Get user's album statistics
   */
  async getUserAlbumStats(userId: string): Promise<UserAlbumStats> {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get total albums listened
      const { count: totalAlbums, error: albumsError } = await supabase
        .from('user_albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_listened', true);

      if (albumsError) {
        throw albumsError;
      }

      // Get total ratings
      const { count: totalRatings, error: ratingsError } = await supabase
        .from('user_albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('rating', 'is', null);

      if (ratingsError) {
        throw ratingsError;
      }

      // Get average rating
      const { data: avgData, error: avgError } = await supabase
        .from('user_albums')
        .select('rating')
        .eq('user_id', userId)
        .not('rating', 'is', null);

      if (avgError) {
        throw avgError;
      }

      const averageRating = avgData.length > 0 
        ? avgData.reduce((sum, item) => sum + item.rating, 0) / avgData.length 
        : 0;

      // Get albums this year
      const { count: albumsThisYear, error: yearAlbumsError } = await supabase
        .from('user_albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_listened', true)
        .gte('listened_at', `${currentYear}-01-01T00:00:00.000Z`)
        .lt('listened_at', `${currentYear + 1}-01-01T00:00:00.000Z`);

      if (yearAlbumsError) {
        throw yearAlbumsError;
      }

      // Get ratings this year
      const { count: ratingsThisYear, error: yearRatingsError } = await supabase
        .from('user_albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('rating', 'is', null)
        .gte('updated_at', `${currentYear}-01-01T00:00:00.000Z`)
        .lt('updated_at', `${currentYear + 1}-01-01T00:00:00.000Z`);

      if (yearRatingsError) {
        throw yearRatingsError;
      }

      return {
        totalAlbums: totalAlbums || 0,
        totalRatings: totalRatings || 0,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        albumsThisYear: albumsThisYear || 0,
        ratingsThisYear: ratingsThisYear || 0
      };
    } catch (error) {
      console.error('Error getting user album stats:', error);
      throw error;
    }
  }

  /**
   * Get multiple user album interactions in batch
   */
  async getUserAlbumInteractions(userId: string, albumIds: string[]): Promise<Record<string, UserAlbumInteraction>> {
    try {
      if (albumIds.length === 0) {
        return {};
      }

      const { data, error } = await supabase
        .from('user_albums')
        .select('*')
        .eq('user_id', userId)
        .in('album_id', albumIds);

      if (error) {
        throw error;
      }

      const interactions: Record<string, UserAlbumInteraction> = {};
      data.forEach(interaction => {
        interactions[interaction.album_id] = interaction;
      });

      return interactions;
    } catch (error) {
      console.error('Error getting user album interactions:', error);
      throw error;
    }
  }

  /**
   * Check if user has listened to an album
   */
  async hasUserListenedToAlbum(userId: string, albumId: string): Promise<boolean> {
    try {
      const interaction = await this.getUserAlbumInteraction(userId, albumId);
      return interaction?.is_listened || false;
    } catch (error) {
      console.error('Error checking if user listened to album:', error);
      return false;
    }
  }

  /**
   * Get user's rating for an album
   */
  async getUserAlbumRating(userId: string, albumId: string): Promise<number | null> {
    try {
      const interaction = await this.getUserAlbumInteraction(userId, albumId);
      return interaction?.rating || null;
    } catch (error) {
      console.error('Error getting user album rating:', error);
      return null;
    }
  }
}

export const userAlbumsService = new UserAlbumsService();