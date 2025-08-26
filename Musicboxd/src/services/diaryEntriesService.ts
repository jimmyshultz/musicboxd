import { supabase } from './supabase';

export interface DiaryEntry {
  id: string;
  user_id: string;
  album_id: string;
  diary_date: string; // YYYY-MM-DD format
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

// Utility helpers
function toISODateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthKey(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  return dateStr.slice(0, 7); // YYYY-MM
}

class DiaryEntriesService {
  /**
   * Create a diary entry
   */
  async createDiaryEntry(
    userId: string,
    albumId: string,
    diaryDate: string,
    rating?: number,
    notes?: string
  ): Promise<{ success: boolean; entry?: DiaryEntry; message?: string }> {
    try {
      // Validate rating if provided
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return { success: false, message: 'Rating must be between 1 and 5' };
      }

      // First, ensure the album exists in the albums table
      await this.ensureAlbumExists(albumId);

      const { data, error } = await supabase
        .from('diary_entries')
        .insert({
          user_id: userId,
          album_id: albumId,
          diary_date: diaryDate,
          rating: rating || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return { success: false, message: 'You already logged this album for that date.' };
        }
        throw error;
      }

      return { success: true, entry: data };
    } catch (error) {
      console.error('Error creating diary entry:', error);
      return { success: false, message: 'Failed to create diary entry' };
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
   * Update a diary entry
   */
  async updateDiaryEntry(
    entryId: string,
    updates: { diaryDate?: string; rating?: number; notes?: string }
  ): Promise<{ success: boolean; entry?: DiaryEntry; message?: string }> {
    try {
      // Validate rating if provided
      if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
        return { success: false, message: 'Rating must be between 1 and 5' };
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.diaryDate !== undefined) {
        updateData.diary_date = updates.diaryDate;
      }
      if (updates.rating !== undefined) {
        updateData.rating = updates.rating;
      }
      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }

      const { data, error } = await supabase
        .from('diary_entries')
        .update(updateData)
        .eq('id', entryId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return { success: false, message: 'You already logged this album for that date.' };
        }
        throw error;
      }

      return { success: true, entry: data };
    } catch (error) {
      console.error('Error updating diary entry:', error);
      return { success: false, message: 'Failed to update diary entry' };
    }
  }

  /**
   * Delete a diary entry
   */
  async deleteDiaryEntry(entryId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting diary entry:', error);
      return { success: false };
    }
  }

  /**
   * Get diary entry by ID
   */
  async getDiaryEntryById(entryId: string): Promise<DiaryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting diary entry:', error);
      return null;
    }
  }

  /**
   * Get diary entries for a user with pagination
   */
  async getDiaryEntriesByUser(
    userId: string,
    params: { startAfterMonth?: string; monthWindow?: number } = {}
  ): Promise<{ entries: DiaryEntryWithAlbum[]; lastMonth?: string; hasMore: boolean }> {
    try {
      const monthWindow = params.monthWindow ?? 3;
      let query = supabase
        .from('diary_entries')
        .select(`
          *,
          albums (*)
        `)
        .eq('user_id', userId)
        .order('diary_date', { ascending: false })
        .order('created_at', { ascending: false });

      // If startAfterMonth is provided, filter from that point
      if (params.startAfterMonth) {
        query = query.lt('diary_date', `${params.startAfterMonth}-32`); // Start after the month
      }

      // Get more entries than needed to determine if there are more
      const { data, error } = await query.limit(100);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return { entries: [], hasMore: false };
      }

      // Group by month and take only the specified window
      const seenMonths: Set<string> = new Set();
      const result: DiaryEntryWithAlbum[] = [];
      let lastMonth: string | undefined;

      for (const entry of data) {
        const monthKey = getMonthKey(entry.diary_date);
        
        if (!seenMonths.has(monthKey) && seenMonths.size >= monthWindow) {
          break;
        }
        
        seenMonths.add(monthKey);
        result.push(entry);
        lastMonth = monthKey;
      }

      // Check if there are more entries beyond what we took
      const hasMore = data.length > result.length;

      return { entries: result, lastMonth, hasMore };
    } catch (error) {
      console.error('Error getting diary entries:', error);
      return { entries: [], hasMore: false };
    }
  }

  /**
   * Get recent diary entries for activity feed
   */
  async getRecentDiaryEntries(userId: string, limit: number = 5): Promise<DiaryEntryWithAlbum[]> {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select(`
          *,
          albums (*)
        `)
        .eq('user_id', userId)
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

  /**
   * Get diary entries count for a user
   */
  async getUserDiaryCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('diary_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting user diary count:', error);
      return 0;
    }
  }

  /**
   * Check if user has diary entry for album on specific date
   */
  async hasDiaryEntry(userId: string, albumId: string, diaryDate: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .eq('diary_date', diaryDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking diary entry:', error);
      return false;
    }
  }
}

export const diaryEntriesService = new DiaryEntriesService();