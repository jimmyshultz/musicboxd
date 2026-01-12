import { supabase } from './supabase';

export interface DiaryEntry {
  id: string;
  user_id: string;
  album_id: string;
  diary_date: string;
  rating?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntryWithAlbum extends DiaryEntry {
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

class DiaryService {
  /**
   * Get diary entries for a user with album details
   */
  async getUserDiaryEntriesWithAlbums(
    userId: string,
  ): Promise<DiaryEntryWithAlbum[]> {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select(
          `
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
        `,
        )
        .eq('user_id', userId)
        .order('diary_date', { ascending: false })
        .order('created_at', { ascending: false }); // Secondary sort by creation time

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user diary entries with albums:', error);
      return [];
    }
  }

  /**
   * Get recent diary entries for multiple users (for friend feeds)
   */
  async getRecentDiaryEntriesForUsers(
    userIds: string[],
    limit: number = 50,
  ): Promise<DiaryEntryWithAlbum[]> {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select(
          `
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
        `,
        )
        .in('user_id', userIds)
        .order('diary_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent diary entries for users:', error);
      return [];
    }
  }

  /**
   * Get diary entries from the last N days
   */
  async getRecentDiaryEntries(
    days: number = 7,
    limit: number = 50,
  ): Promise<DiaryEntryWithAlbum[]> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const { data, error } = await supabase
        .from('diary_entries')
        .select(
          `
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
        `,
        )
        .gte('diary_date', dateThreshold.toISOString().split('T')[0]) // Format as YYYY-MM-DD
        .order('diary_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent diary entries:', error);
      return [];
    }
  }
}

export const diaryService = new DiaryService();
