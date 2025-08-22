import { SPOTIFY_CONFIG } from '../config/spotify';
import {
  SpotifyAuthResponse,
  SpotifySearchResponse,
  SpotifyAlbum,
  SpotifySearchParams,
  SpotifyAlbumParams,
  SpotifyMultipleAlbumsParams,
  SpotifyError,
  isSpotifyError,
} from '../types/spotify';
import { Buffer } from 'buffer';

export class SpotifyService {
  private static accessToken: string | null = null;
  private static tokenExpiresAt: number = 0;
  private static lastRequestTime: number = 0;
  private static requestQueue: Array<() => void> = [];
  private static isProcessingQueue: boolean = false;

  /**
   * Get access token using Client Credentials flow
   * This flow is suitable for server-to-server authentication
   */
  private static async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 5 * 60 * 1000) {
      return this.accessToken;
    }

    try {
      const authString = Buffer.from(
        `${SPOTIFY_CONFIG.CLIENT_ID}:${SPOTIFY_CONFIG.CLIENT_SECRET}`
      ).toString('base64');

      const response = await fetch(SPOTIFY_CONFIG.AUTH_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const authData: SpotifyAuthResponse = await response.json();
      
      this.accessToken = authData.access_token;
      this.tokenExpiresAt = now + (authData.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Spotify authentication error:', error);
      throw new Error('Failed to authenticate with Spotify API');
    }
  }

  /**
   * Rate limiting implementation
   * Ensures we don't exceed Spotify's rate limits
   */
  private static async enforceRateLimit(): Promise<void> {
    return new Promise((resolve) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minInterval = 1000 / SPOTIFY_CONFIG.RATE_LIMIT.REQUESTS_PER_SECOND;

      if (timeSinceLastRequest >= minInterval) {
        this.lastRequestTime = now;
        resolve();
      } else {
        const delay = minInterval - timeSinceLastRequest;
        setTimeout(() => {
          this.lastRequestTime = Date.now();
          resolve();
        }, delay);
      }
    });
  }

  /**
   * Make authenticated API request with retry logic
   */
  private static async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    await this.enforceRateLimit();
    
    const accessToken = await this.getAccessToken();
    const url = new URL(SPOTIFY_CONFIG.API_BASE_URL + endpoint);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    for (let attempt = 1; attempt <= SPOTIFY_CONFIG.RATE_LIMIT.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : SPOTIFY_CONFIG.RATE_LIMIT.RETRY_DELAY * attempt;
          console.warn(`Rate limited by Spotify. Waiting ${delay}ms before retry ${attempt}/${SPOTIFY_CONFIG.RATE_LIMIT.RETRY_ATTEMPTS}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (response.status === 401) {
          // Token expired - clear it and retry
          this.accessToken = null;
          this.tokenExpiresAt = 0;
          if (attempt === 1) {
            continue; // Retry with new token
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Spotify API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data: T = await response.json();
        
        // Check if the response is a Spotify error
        if (isSpotifyError(data)) {
          throw new Error(`Spotify API error: ${data.error.status} - ${data.error.message}`);
        }

        return data;
      } catch (error) {
        if (attempt === SPOTIFY_CONFIG.RATE_LIMIT.RETRY_ATTEMPTS) {
          console.error(`Spotify API request failed after ${attempt} attempts:`, error);
          throw error;
        }
        
        console.warn(`Spotify API request attempt ${attempt} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, SPOTIFY_CONFIG.RATE_LIMIT.RETRY_DELAY * attempt));
      }
    }

    throw new Error('Failed to complete Spotify API request');
  }

  /**
   * Search for albums, artists, or tracks
   */
  static async search(params: SpotifySearchParams): Promise<SpotifySearchResponse> {
    const searchParams: Record<string, string> = {
      q: params.q,
      type: params.type,
      limit: (params.limit || SPOTIFY_CONFIG.SEARCH.DEFAULT_LIMIT).toString(),
      offset: (params.offset || 0).toString(),
    };

    if (params.market) {
      searchParams.market = params.market;
    }

    if (params.include_external) {
      searchParams.include_external = params.include_external;
    }

    return this.makeRequest<SpotifySearchResponse>(SPOTIFY_CONFIG.ENDPOINTS.SEARCH, searchParams);
  }

  /**
   * Search specifically for albums
   */
  static async searchAlbums(
    query: string, 
    limit: number = SPOTIFY_CONFIG.SEARCH.DEFAULT_LIMIT,
    offset: number = 0,
    market: string = SPOTIFY_CONFIG.SEARCH.DEFAULT_MARKET
  ): Promise<SpotifySearchResponse> {
    return this.search({
      q: query,
      type: SPOTIFY_CONFIG.SEARCH.TYPES.ALBUM,
      limit,
      offset,
      market,
    });
  }

  /**
   * Get album details by ID
   */
  static async getAlbum(
    albumId: string, 
    params?: SpotifyAlbumParams
  ): Promise<SpotifyAlbum> {
    const requestParams: Record<string, string> = {};
    
    if (params?.market) {
      requestParams.market = params.market;
    }

    return this.makeRequest<SpotifyAlbum>(
      `${SPOTIFY_CONFIG.ENDPOINTS.ALBUMS}/${albumId}`,
      Object.keys(requestParams).length > 0 ? requestParams : undefined
    );
  }

  /**
   * Get multiple albums by IDs
   */
  static async getMultipleAlbums(
    params: SpotifyMultipleAlbumsParams
  ): Promise<{ albums: SpotifyAlbum[] }> {
    const requestParams: Record<string, string> = {
      ids: params.ids.join(','),
    };

    if (params.market) {
      requestParams.market = params.market;
    }

    return this.makeRequest<{ albums: SpotifyAlbum[] }>(
      SPOTIFY_CONFIG.ENDPOINTS.ALBUMS,
      requestParams
    );
  }

  /**
   * Get album tracks
   */
  static async getAlbumTracks(
    albumId: string,
    limit: number = 50,
    offset: number = 0,
    market?: string
  ) {
    const requestParams: Record<string, string> = {
      limit: limit.toString(),
      offset: offset.toString(),
    };

    if (market) {
      requestParams.market = market;
    }

    return this.makeRequest(
      `${SPOTIFY_CONFIG.ENDPOINTS.ALBUMS}/${albumId}/tracks`,
      requestParams
    );
  }

  /**
   * Get popular albums by searching for popular artists and their albums
   * Since Spotify doesn't have a direct "popular albums" endpoint,
   * we'll search for albums from popular genres and artists
   */
  static async getPopularAlbums(
    limit: number = SPOTIFY_CONFIG.SEARCH.DEFAULT_LIMIT,
    market: string = SPOTIFY_CONFIG.SEARCH.DEFAULT_MARKET
  ): Promise<SpotifySearchResponse> {
    // Search for albums from popular genres/years
    const popularQueries = [
      'year:2023 OR year:2022 OR year:2021',
      'genre:pop OR genre:rock OR genre:hip-hop',
      'genre:indie OR genre:alternative',
    ];

    // For now, use the first query. In a real app, you might want to combine results
    const query = popularQueries[0];
    
    return this.searchAlbums(query, limit, 0, market);
  }

  /**
   * Check if the service is properly configured
   */
  static isConfigured(): boolean {
    return SPOTIFY_CONFIG.CLIENT_ID !== 'your_spotify_client_id' &&
           SPOTIFY_CONFIG.CLIENT_SECRET !== 'your_spotify_client_secret' &&
           SPOTIFY_CONFIG.CLIENT_ID.length > 0 &&
           SPOTIFY_CONFIG.CLIENT_SECRET.length > 0;
  }

  /**
   * Clear cached authentication data
   */
  static clearAuth(): void {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }
}