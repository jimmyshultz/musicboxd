// User types
export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  joinedDate: Date;
  lastActiveDate: Date;
  preferences: UserPreferences;
}

// Serialized user for Redux (with string dates)
export interface SerializedUser {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  joinedDate: string;
  lastActiveDate: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  favoriteGenres: string[];
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  newFollowers: boolean;
  reviewLikes: boolean;
  friendActivity: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private';
  activityVisibility: 'public' | 'friends' | 'private';
}

// Album types
export interface Album {
  id: string;
  title: string;
  artist: string;
  releaseDate: string;
  genre: string[];
  coverImageUrl: string;
  trackList: Track[];
  description?: string;
  externalIds: {
    spotify?: string;
    appleMusic?: string;
    lastfm?: string;
  };
}

export interface Track {
  id: string;
  trackNumber: number;
  title: string;
  duration: number; // in seconds
  artist?: string; // for featuring artists
}

// User interaction types
export interface Listen {
  id: string;
  userId: string;
  albumId: string;
  dateListened: Date;
  notes?: string;
}

export interface Review {
  id: string;
  userId: string;
  albumId: string;
  rating: number; // 1-5 stars
  reviewText?: string;
  dateReviewed: Date;
  likesCount: number;
  commentsCount: number;
}

export interface UserList {
  id: string;
  userId: string;
  title: string;
  description?: string;
  albumIds: string[];
  privacy: 'public' | 'private';
  dateCreated: Date;
  dateUpdated: Date;
}

// Social types
export interface Follow {
  followerId: string;
  followingId: string;
  dateFollowed: Date;
}

export interface Activity {
  id: string;
  userId: string;
  type: 'listen' | 'review' | 'list_created' | 'follow';
  albumId?: string;
  reviewId?: string;
  listId?: string;
  followedUserId?: string;
  timestamp: Date;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

// Stack navigator types for each tab
export type HomeStackParamList = {
  HomeMain: undefined;
  AlbumDetails: { albumId: string };
  UserProfile: { userId: string };
  Followers: { userId: string; username: string; initialTab?: 'followers' | 'following' };
  ListenedAlbums: { userId: string; username: string };
  UserReviews: { userId: string; username: string };
};

export type SearchStackParamList = {
  SearchMain: undefined;
  AlbumDetails: { albumId: string };
  UserProfile: { userId: string };
  Followers: { userId: string; username: string; initialTab?: 'followers' | 'following' };
  ListenedAlbums: { userId: string; username: string };
  UserReviews: { userId: string; username: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  AlbumDetails: { albumId: string };
  UserProfile: { userId: string };
  Followers: { userId: string; username: string; initialTab?: 'followers' | 'following' };
  ListenedAlbums: { userId: string; username: string };
  UserReviews: { userId: string; username: string };
};

// Search types
export interface SearchResult {
  albums: Album[];
  artists: string[];
  totalResults: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}