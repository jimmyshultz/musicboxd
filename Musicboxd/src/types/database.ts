// Database Types for Musicboxd
// These types correspond to the Supabase database schema

export interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string; // Spotify album ID
  name: string;
  artist_name: string;
  release_date?: string;
  image_url?: string;
  spotify_url?: string;
  total_tracks?: number;
  album_type?: 'album' | 'single' | 'compilation';
  genres?: string[];
  created_at: string;
  updated_at: string;
}

export interface UserAlbum {
  id: string;
  user_id: string;
  album_id: string;
  rating?: number; // 1-5 stars
  is_listened: boolean;
  listened_at?: string;
  review?: string;
  created_at: string;
  updated_at: string;
  // Relations (populated when joining)
  album?: Album;
  user_profile?: UserProfile;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  // Relations (populated when joining)
  follower?: UserProfile;
  following?: UserProfile;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'rating' | 'review' | 'listen';
  album_id: string;
  rating?: number;
  review_excerpt?: string;
  created_at: string;
  // Relations (populated when joining)
  user_profile?: UserProfile;
  album?: Album;
}

// Database table names for type safety
export const TableNames = {
  USER_PROFILES: 'user_profiles',
  ALBUMS: 'albums',
  USER_ALBUMS: 'user_albums',
  USER_FOLLOWS: 'user_follows',
  USER_ACTIVITIES: 'user_activities',
} as const;

// Supabase database type definition
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> & {
          id: string;
        };
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      albums: {
        Row: Album;
        Insert: Omit<Album, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Album, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_albums: {
        Row: UserAlbum;
        Insert: Omit<UserAlbum, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserAlbum, 'id' | 'user_id' | 'album_id' | 'created_at' | 'updated_at'>>;
      };
      user_follows: {
        Row: UserFollow;
        Insert: Omit<UserFollow, 'id' | 'created_at'>;
        Update: never; // Follows are only created or deleted, not updated
      };
      user_activities: {
        Row: UserActivity;
        Insert: Omit<UserActivity, 'id' | 'created_at'>;
        Update: never; // Activities are immutable once created
      };
    };
  };
}