import { supabase } from './supabase';
import { DiaryEntryComment } from '../types/database';

export interface DiaryEntry {
  id: string;
  user_id: string;
  album_id: string;
  diary_date: string; // YYYY-MM-DD format
  rating?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  comments_count?: number;
}

export interface DiaryEntrySocialInfo {
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
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

export interface DiaryEntryWithUserProfile extends DiaryEntry {
  user_profiles?: {
    id: string;
    username: string;
    avatar_url?: string;
    display_name?: string;
  };
}

// Utility helpers
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
      // Validate rating if provided (must be in 0.5 increments between 0.5 and 5.0)
      if (rating !== undefined && (rating < 0.5 || rating > 5.0 || (rating * 2) !== Math.floor(rating * 2))) {
        return { success: false, message: 'Rating must be between 0.5 and 5.0 in 0.5 increments' };
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
    updates: { diaryDate?: string; rating?: number | null; notes?: string | null }
  ): Promise<{ success: boolean; entry?: DiaryEntry; message?: string }> {
    try {
      // Validate rating if provided (must be in 0.5 increments between 0.5 and 5.0)
      if (updates.rating !== undefined && updates.rating !== null && (updates.rating < 0.5 || updates.rating > 5.0 || (updates.rating * 2) !== Math.floor(updates.rating * 2))) {
        return { success: false, message: 'Rating must be between 0.5 and 5.0 in 0.5 increments' };
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.diaryDate !== undefined) {
        updateData.diary_date = updates.diaryDate;
      }
      if (updates.rating !== undefined) {
        // Allow null to clear rating
        updateData.rating = updates.rating;
      }
      if (updates.notes !== undefined) {
        // Allow null to clear notes
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
  async getDiaryEntryById(entryId: string, _currentUserId?: string): Promise<DiaryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        return null;
      }

      // If currentUserId is provided, also check if user has liked
      // (counts are already denormalized in the entry)
      return data;
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
        // Create the first day of the next month to filter correctly
        const [year, month] = params.startAfterMonth.split('-').map(Number);
        const nextMonth = new Date(year, month, 1); // month is 0-indexed in Date constructor
        const nextMonthStr = nextMonth.toISOString().split('T')[0];
        query = query.lt('diary_date', nextMonthStr);
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

  /**
   * Get user's diary entries for a specific album
   */
  async getUserDiaryEntriesForAlbum(userId: string, albumId: string): Promise<DiaryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('album_id', albumId)
        .order('diary_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user diary entries for album:', error);
      return [];
    }
  }

  /**
   * Get friends' diary entries for a specific album
   */
  async getFriendsDiaryEntriesForAlbum(userId: string, albumId: string, limit: number = 10): Promise<DiaryEntryWithUserProfile[]> {
    try {
      // First, get the user's following list (friends)
      const { userService } = await import('./userService');
      const friends = await userService.getUserFollowing(userId);
      
      if (friends.length === 0) {
        return [];
      }

      const friendIds = friends.map(friend => friend.id);

      // Query diary entries for these friends and this album
      const { data: entries, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('album_id', albumId)
        .in('user_id', friendIds)
        .order('diary_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!entries || entries.length === 0) {
        return [];
      }

      // Create a map of friend profiles for quick lookup
      const friendsMap = new Map(friends.map(f => [f.id, f]));

      // Combine diary entries with user profile data
      const entriesWithProfiles: DiaryEntryWithUserProfile[] = entries.map(entry => ({
        ...entry,
        user_profiles: friendsMap.get(entry.user_id) ? {
          id: friendsMap.get(entry.user_id)!.id,
          username: friendsMap.get(entry.user_id)!.username,
          avatar_url: friendsMap.get(entry.user_id)!.avatar_url,
          display_name: friendsMap.get(entry.user_id)!.display_name,
        } : undefined
      }));

      return entriesWithProfiles;
    } catch (error) {
      console.error('Error getting friends diary entries for album:', error);
      return [];
    }
  }

  /**
   * Get social info (likes count, comments count, has liked) for a diary entry
   */
  async getDiaryEntrySocialInfo(entryId: string, currentUserId?: string): Promise<DiaryEntrySocialInfo> {
    try {
      // Get the entry with counts
      const { data: entry, error: entryError } = await supabase
        .from('diary_entries')
        .select('likes_count, comments_count')
        .eq('id', entryId)
        .single();

      if (entryError) {
        throw entryError;
      }

      const likesCount = entry?.likes_count || 0;
      const commentsCount = entry?.comments_count || 0;

      // Check if current user has liked
      let hasLiked = false;
      if (currentUserId) {
        const { data: like, error: likeError } = await supabase
          .from('diary_entry_likes')
          .select('id')
          .eq('entry_id', entryId)
          .eq('user_id', currentUserId)
          .single();

        if (!likeError && like) {
          hasLiked = true;
        }
      }

      return {
        likesCount,
        commentsCount,
        hasLiked,
      };
    } catch (error) {
      console.error('Error getting diary entry social info:', error);
      return {
        likesCount: 0,
        commentsCount: 0,
        hasLiked: false,
      };
    }
  }

  /**
   * Like a diary entry
   */
  async likeDiaryEntry(entryId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('Attempting to like diary entry:', { entryId, userId });
      const { data, error } = await supabase
        .from('diary_entry_likes')
        .insert({
          entry_id: entryId,
          user_id: userId,
        })
        .select();

      if (error) {
        console.error('Error inserting like:', error);
        if (error.code === '23505') { // Unique constraint violation
          return { success: false, message: 'You have already liked this entry' };
        }
        if (error.code === '42501') { // Insufficient privilege
          return { success: false, message: 'Permission denied. Please check your account permissions.' };
        }
        throw error;
      }

      console.log('Successfully liked diary entry:', data);
      return { success: true };
    } catch (error) {
      console.error('Error liking diary entry:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to like diary entry' };
    }
  }

  /**
   * Unlike a diary entry
   */
  async unlikeDiaryEntry(entryId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('Attempting to unlike diary entry:', { entryId, userId });
      const { error, data } = await supabase
        .from('diary_entry_likes')
        .delete()
        .eq('entry_id', entryId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error deleting like:', error);
        if (error.code === '42501') { // Insufficient privilege
          return { success: false, message: 'Permission denied. Please check your account permissions.' };
        }
        throw error;
      }

      console.log('Successfully unliked diary entry:', data);
      return { success: true };
    } catch (error) {
      console.error('Error unliking diary entry:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to unlike diary entry' };
    }
  }

  /**
   * Get comments for a diary entry
   */
  async getDiaryEntryComments(
    entryId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<DiaryEntryComment[]> {
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const { data, error } = await supabase
        .from('diary_entry_comments')
        .select(`
          *,
          user_profiles (
            id,
            username,
            avatar_url,
            display_name
          )
        `)
        .eq('entry_id', entryId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      // Transform the data to match DiaryEntryComment interface
      return (data || []).map((comment: any) => ({
        id: comment.id,
        entry_id: comment.entry_id,
        user_id: comment.user_id,
        body: comment.body,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        is_deleted: comment.is_deleted,
        user_profile: comment.user_profiles ? {
          id: comment.user_profiles.id,
          username: comment.user_profiles.username,
          avatar_url: comment.user_profiles.avatar_url,
          display_name: comment.user_profiles.display_name,
          is_private: false,
          created_at: '',
          updated_at: '',
        } : undefined,
      }));
    } catch (error) {
      console.error('Error getting diary entry comments:', error);
      return [];
    }
  }

  /**
   * Create a comment on a diary entry
   */
  async createDiaryEntryComment(
    entryId: string,
    userId: string,
    body: string
  ): Promise<{ success: boolean; comment?: DiaryEntryComment; message?: string }> {
    try {
      // Validate body
      const trimmedBody = body.trim();
      if (trimmedBody.length === 0) {
        return { success: false, message: 'Comment cannot be empty' };
      }
      if (trimmedBody.length > 2000) {
        return { success: false, message: 'Comment cannot exceed 2000 characters' };
      }

      const { data, error } = await supabase
        .from('diary_entry_comments')
        .insert({
          entry_id: entryId,
          user_id: userId,
          body: trimmedBody,
        })
        .select(`
          *,
          user_profiles (
            id,
            username,
            avatar_url,
            display_name
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      const comment: DiaryEntryComment = {
        id: data.id,
        entry_id: data.entry_id,
        user_id: data.user_id,
        body: data.body,
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_deleted: data.is_deleted,
        user_profile: data.user_profiles ? {
          id: data.user_profiles.id,
          username: data.user_profiles.username,
          avatar_url: data.user_profiles.avatar_url,
          display_name: data.user_profiles.display_name,
          is_private: false,
          created_at: '',
          updated_at: '',
        } : undefined,
      };

      return { success: true, comment };
    } catch (error) {
      console.error('Error creating diary entry comment:', error);
      return { success: false, message: 'Failed to create comment' };
    }
  }

  /**
   * Delete a comment (soft delete via is_deleted flag)
   */
  async deleteDiaryEntryComment(commentId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // First check if user owns the comment or the diary entry
      const { data: comment, error: commentError } = await supabase
        .from('diary_entry_comments')
        .select('id, user_id, entry_id')
        .eq('id', commentId)
        .single();

      if (commentError || !comment) {
        return { success: false, message: 'Comment not found' };
      }

      // Check if user is comment author
      const isCommentAuthor = comment.user_id === userId;

      // Check if user is diary entry owner
      const { data: entry, error: entryError } = await supabase
        .from('diary_entries')
        .select('user_id')
        .eq('id', comment.entry_id)
        .single();

      const isEntryOwner = !entryError && entry && entry.user_id === userId;

      if (!isCommentAuthor && !isEntryOwner) {
        return { success: false, message: 'You do not have permission to delete this comment' };
      }

      // Soft delete by setting is_deleted flag
      const { error: deleteError } = await supabase
        .from('diary_entry_comments')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', commentId);

      if (deleteError) {
        throw deleteError;
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting diary entry comment:', error);
      return { success: false, message: 'Failed to delete comment' };
    }
  }
}

export const diaryEntriesService = new DiaryEntriesService();