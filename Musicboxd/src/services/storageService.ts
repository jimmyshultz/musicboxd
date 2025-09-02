import { supabase } from './supabase';
import RNFS from 'react-native-fs';

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

      // Read the file as binary data for React Native
      const fileExists = await RNFS.exists(imageUri);
      if (!fileExists) {
        throw new Error('File not found');
      }

      // Read file as base64 and convert to blob
      const base64Data = await RNFS.readFile(imageUri, 'base64');
      const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
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