// Spotify Web API Response Types
// Based on official Spotify Web API documentation

export interface SpotifyAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Base Spotify objects
export interface SpotifyImage {
  height: number | null;
  url: string;
  width: number | null;
}

export interface SpotifyExternalUrls {
  spotify: string;
}

export interface SpotifyExternalIds {
  isrc?: string;
  ean?: string;
  upc?: string;
}

// Spotify Artist
export interface SpotifyArtist {
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  name: string;
  type: 'artist';
  uri: string;
  followers?: {
    href: string | null;
    total: number;
  };
  genres?: string[];
  images?: SpotifyImage[];
  popularity?: number;
}

// Spotify Album
export interface SpotifyAlbum {
  album_type: 'album' | 'single' | 'compilation';
  total_tracks: number;
  available_markets: string[];
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  type: 'album';
  uri: string;
  artists: SpotifyArtist[];
  tracks?: SpotifyPagingObject<SpotifyTrack>;
  genres?: string[];
  label?: string;
  popularity?: number;
  external_ids?: SpotifyExternalIds;
}

// Spotify Track
export interface SpotifyTrack {
  artists: SpotifyArtist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids?: SpotifyExternalIds;
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  popularity?: number;
  preview_url: string | null;
  track_number: number;
  type: 'track';
  uri: string;
  album?: SpotifyAlbum;
}

// Spotify Paging Object
export interface SpotifyPagingObject<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

// Spotify Search Response
export interface SpotifySearchResponse {
  albums?: SpotifyPagingObject<SpotifyAlbum>;
  artists?: SpotifyPagingObject<SpotifyArtist>;
  tracks?: SpotifyPagingObject<SpotifyTrack>;
}

// Spotify API Error
export interface SpotifyError {
  error: {
    status: number;
    message: string;
  };
}

// Search parameters
export interface SpotifySearchParams {
  q: string;
  type: 'album' | 'artist' | 'track' | string;
  market?: string;
  limit?: number;
  offset?: number;
  include_external?: 'audio';
}

// Album details parameters
export interface SpotifyAlbumParams {
  market?: string;
}

// Multiple albums parameters
export interface SpotifyMultipleAlbumsParams {
  ids: string[];
  market?: string;
}

// Utility type to check if response is an error
export function isSpotifyError(response: any): response is SpotifyError {
  return response && response.error && typeof response.error.status === 'number';
}