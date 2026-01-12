// User types
export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  joinedDate: Date;
  lastActiveDate: Date;
  termsAcceptedAt?: Date; // Timestamp when user accepted Terms of Service
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
  termsAcceptedAt?: string; // ISO string timestamp when user accepted Terms of Service
  preferences: UserPreferences;
}

export interface UserPreferences {
  favoriteGenres: string[];
  favoriteAlbumIds: string[];
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
  artistId?: string; // Link to artists table (Spotify artist ID)
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

// Artist types
export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  genres: string[];
  spotifyUrl?: string;
  followerCount?: number;
  popularity?: number;
}

export interface ArtistWithAlbums extends Artist {
  albums: Album[];
  totalAlbums: number;
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
  rating: number; // 0.5-5.0 stars in 0.5 increments
  reviewText?: string;
  dateReviewed: Date | string; // Allow both Date objects and ISO strings for Redux serialization
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

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | 'follow'
    | 'follow_request'
    | 'follow_request_accepted'
    | 'diary_like'
    | 'diary_comment';
  actorId: string;
  actorUsername?: string;
  actorAvatar?: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

// Diary types
export interface DiaryEntry {
  id: string;
  userId: string;
  albumId: string;
  diaryDate: string; // YYYY-MM-DD in user's local time
  ratingAtTime?: number; // 0.5-5.0 optional, in 0.5 increments
  review?: string; // Optional review/notes about the album
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  likesCount?: number; // Count of likes
  commentsCount?: number; // Count of comments
}

export interface DiaryEntryLike {
  id: string;
  entryId: string;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface DiaryEntryComment {
  id: string;
  entryId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  TermsAcceptance: undefined;
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
  ArtistDetails: { artistId: string; artistName?: string };
  UserProfile: { userId: string };
  Followers: {
    userId: string;
    username: string;
    initialTab?: 'followers' | 'following';
  };
  ListenedAlbums: { userId: string; username: string };
  UserReviews: { userId: string; username: string };
  PopularThisWeek: undefined;
  NewFromFriends: undefined;
  PopularWithFriends: undefined;
  FavoriteAlbumsManagement: undefined;
  Diary: { userId: string; username: string };
  DiaryEntryDetails: { entryId: string; userId: string };
  EditProfile: undefined;
  Notifications: undefined;
};

export type SearchStackParamList = {
  SearchMain: undefined;
  AlbumDetails: { albumId: string };
  ArtistDetails: { artistId: string; artistName?: string };
  UserProfile: { userId: string };
  Followers: {
    userId: string;
    username: string;
    initialTab?: 'followers' | 'following';
  };
  ListenedAlbums: { userId: string; username: string };
  UserReviews: { userId: string; username: string };
  PopularThisWeek: undefined;
  NewFromFriends: undefined;
  PopularWithFriends: undefined;
  FavoriteAlbumsManagement: undefined;
  Diary: { userId: string; username: string };
  DiaryEntryDetails: { entryId: string; userId: string };
  EditProfile: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  AlbumDetails: { albumId: string };
  ArtistDetails: { artistId: string; artistName?: string };
  UserProfile: { userId: string };
  Followers: {
    userId: string;
    username: string;
    initialTab?: 'followers' | 'following';
  };
  ListenedAlbums: { userId: string; username: string };
  UserReviews: { userId: string; username: string };
  PopularThisWeek: undefined;
  NewFromFriends: undefined;
  PopularWithFriends: undefined;
  FavoriteAlbumsManagement: undefined;
  Diary: { userId: string; username: string };
  DiaryEntryDetails: { entryId: string; userId: string };
  Settings: undefined;
  FollowRequests: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  BlockedUsers: undefined;
  EditProfile: undefined;
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
