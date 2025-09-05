import { supabase } from './supabase';

class StorageService {
  /**
   * Upload profile picture to Supabase storage
   */
  async uploadProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
      console.log('Starting upload for user:', userId);
      console.log('Image URI:', imageUri);
      
      // Create a filename that matches our RLS policy (must contain userId)
      const timestamp = Date.now();
      const fileName = `${userId}_${timestamp}.jpg`;
      const filePath = `profile-pictures/${fileName}`;
      
      console.log('Upload path:', filePath);
      console.log('Filename:', fileName);

      // Read the file using fetch (works better in React Native)
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      
      console.log('File size after fetch:', arrayBuffer.byteLength);

      // Upload the array buffer to Supabase storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false, // Don't overwrite existing files
        });

      console.log('Upload result:', { data, error });

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