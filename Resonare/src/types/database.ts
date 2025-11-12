// Database Types for Resonare
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

export interface Artist {
  id: string; // Spotify artist ID
  name: string;
  image_url?: string;
  spotify_url?: string;
  genres?: string[];
  follower_count?: number;
  popularity?: number;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string; // Spotify album ID
  name: string;
  artist_name: string;
  artist_id?: string; // Link to artists table (Spotify artist ID)
  release_date?: string;
  image_url?: string;
  spotify_url?: string;
  total_tracks?: number;
  album_type?: 'album' | 'single' | 'compilation';
  genres?: string[];
  created_at: string;
  updated_at: string;
  // Relations (populated when joining)
  artist?: Artist;
}

// Schema V2: Separate tables for different activity types

export interface AlbumListen {
  id: string;
  user_id: string;
  album_id: string;
  is_listened: boolean;
  first_listened_at: string;
  created_at: string;
  updated_at: string;
  // Relations (populated when joining)
  album?: Album;
  user_profile?: UserProfile;
}

export interface AlbumRating {
  id: string;
  user_id: string;
  album_id: string;
  rating: number; // 0.5-5.0 stars in 0.5 increments, required in V2
  review?: string;
  created_at: string;
  updated_at: string;
  // Relations (populated when joining)
  album?: Album;
  user_profile?: UserProfile;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  album_id: string;
  diary_date: string; // Date string YYYY-MM-DD
  rating?: number; // Optional rating at time of listen, 0.5-5.0 stars in 0.5 increments
  notes?: string;
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

export interface FollowRequest {
  id: string;
  requester_id: string;
  requested_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  // Relations (populated when joining)
  requester?: UserProfile;
  requested?: UserProfile;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'listen' | 'rating' | 'diary';
  album_id: string;
  reference_id?: string; // Points to the specific listen/rating/diary record
  created_at: string;
  // Relations (populated when joining)
  user_profile?: UserProfile;
  album?: Album;
}

// Database table names for type safety (Schema V2)
export const TableNames = {
  USER_PROFILES: 'user_profiles',
  ARTISTS: 'artists',
  ALBUMS: 'albums',
  ALBUM_LISTENS: 'album_listens',
  ALBUM_RATINGS: 'album_ratings',
  DIARY_ENTRIES: 'diary_entries',
  USER_FOLLOWS: 'user_follows',
  USER_ACTIVITIES: 'user_activities',
} as const;

// Supabase database type definition (Schema V2)
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
      artists: {
        Row: Artist;
        Insert: Omit<Artist, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Artist, 'id' | 'created_at' | 'updated_at'>>;
      };
      albums: {
        Row: Album;
        Insert: Omit<Album, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Album, 'id' | 'created_at' | 'updated_at'>>;
      };
      album_listens: {
        Row: AlbumListen;
        Insert: Omit<AlbumListen, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AlbumListen, 'id' | 'user_id' | 'album_id' | 'created_at' | 'updated_at'>>;
      };
      album_ratings: {
        Row: AlbumRating;
        Insert: Omit<AlbumRating, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AlbumRating, 'id' | 'user_id' | 'album_id' | 'created_at' | 'updated_at'>>;
      };
      diary_entries: {
        Row: DiaryEntry;
        Insert: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DiaryEntry, 'id' | 'user_id' | 'album_id' | 'created_at' | 'updated_at'>>;
      };
      user_follows: {
        Row: UserFollow;
        Insert: Omit<UserFollow, 'id' | 'created_at'>;
        Update: never; // Follows are only created or deleted, not updated
      };
      follow_requests: {
        Row: FollowRequest;
        Insert: Omit<FollowRequest, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Pick<FollowRequest, 'status'>>;
      };
      user_activities: {
        Row: UserActivity;
        Insert: Omit<UserActivity, 'id' | 'created_at'>;
        Update: never; // Activities are immutable once created
      };
    };
  };
}