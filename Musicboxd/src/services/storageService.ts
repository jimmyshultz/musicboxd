import { supabase } from './supabase';

class StorageService {
  /**
   * Upload profile picture to Supabase storage
   */
  async uploadProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `profile_${userId}_${timestamp}.jpg`;
      const filePath = `profile-pictures/${fileName}`;

      // Create file object for React Native Supabase upload
      const fileObject = {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName,
      };

      // Upload file object directly to Supabase storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileObject as any, {
          contentType: 'image/jpeg',
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw new Error('Failed to upload profile picture');
    }
  }

  /**
   * Delete old profile picture from storage
   */
  async deleteProfilePicture(avatarUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(avatarUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = `profile-pictures/${fileName}`;

      const { error } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (error) {
        console.warn('Could not delete old profile picture:', error);
        // Don't throw error for deletion failures
      }
    } catch (error) {
      console.warn('Error deleting old profile picture:', error);
      // Don't throw error for deletion failures
    }
  }
}

export const storageService = new StorageService();