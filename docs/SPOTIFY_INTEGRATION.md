# Spotify API Integration Guide
> Technical Implementation & Data Caching Strategy

## 🎵 **Integration Overview**

This document outlines the complete Spotify Web API integration strategy for Musicboxd, including the 3-tier caching system, API usage patterns, and implementation details for optimal performance and cost efficiency.

### **Integration Goals**
- ✅ **Full Catalog Access**: Access to Spotify's 70M+ track database
- ✅ **Cost Optimization**: Minimize API calls through intelligent caching
- ✅ **Performance**: Sub-2-second search response times
- ✅ **Compliance**: Adhere to Spotify's terms of service and rate limits
- ✅ **Scalability**: Architecture that grows with user base

---

## 🔑 **Spotify API Setup**

### **Developer Account Setup**
```bash
# 1. Create Spotify Developer Account
# Visit: https://developer.spotify.com/dashboard
# Sign up with existing Spotify account or create new one

# 2. Create App in Dashboard
# App Name: Musicboxd (Development/Staging/Production)
# App Description: Social music album rating platform
# Website: https://musicboxd.com (or your domain)
# Redirect URIs: Not needed for Client Credentials flow

# 3. Obtain Credentials
# Client ID: Used for API authentication
# Client Secret: Keep secure, used for token generation
```

### **API Authentication Strategy**
```javascript
// Client Credentials Flow (recommended for app-only requests)
class SpotifyAuthService {
  private static accessToken: string | null = null;
  private static tokenExpiry: Date | null = null;

  static async getAccessToken(): Promise<string> {
    // Check if current token is still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Request new token
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000) - 60000); // 1 minute buffer

    return this.accessToken;
  }
}
```

### **Environment Configuration**
```typescript
// Environment-specific Spotify configuration
interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  rateLimit: {
    requestsPerSecond: number;
    burstLimit: number;
  };
}

const spotifyConfig: Record<string, SpotifyConfig> = {
  development: {
    clientId: process.env.SPOTIFY_DEV_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_DEV_CLIENT_SECRET!,
    baseUrl: 'https://api.spotify.com/v1',
    rateLimit: {
      requestsPerSecond: 10, // Conservative for development
      burstLimit: 50
    }
  },
  staging: {
    clientId: process.env.SPOTIFY_STAGING_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_STAGING_CLIENT_SECRET!,
    baseUrl: 'https://api.spotify.com/v1',
    rateLimit: {
      requestsPerSecond: 20,
      burstLimit: 100
    }
  },
  production: {
    clientId: process.env.SPOTIFY_PROD_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_PROD_CLIENT_SECRET!,
    baseUrl: 'https://api.spotify.com/v1',
    rateLimit: {
      requestsPerSecond: 50, // Full free tier allowance
      burstLimit: 200
    }
  }
};
```

---

## 🗂 **3-Tier Caching Strategy**

### **Architecture Overview**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Request  │ ── │  Tier 1: Popular │ ── │ Tier 2: Searched│
│   (Search)      │    │  Albums Cache    │    │  Albums Cache   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌──────────────────┐    ┌─────────────────┐
                        │   Database       │    │  Tier 3: Live   │
                        │   (Supabase)     │    │  Spotify API    │
                        └──────────────────┘    └─────────────────┘
```

### **Tier 1: Popular Albums Cache**

#### **Purpose & Strategy**
- **Goal**: Instant access to the most popular albums
- **Size**: 10,000-50,000 albums
- **Update Frequency**: Weekly batch job
- **Hit Rate Target**: 60-70% of all searches

#### **Population Algorithm**
```javascript
class PopularAlbumsCacheService {
  static async populateCache(): Promise<void> {
    try {
      console.log('Starting popular albums cache population...');
      
      // 1. Get featured playlists from Spotify
      const playlists = await this.getFeaturedPlaylists();
      
      // 2. Extract albums from playlists
      const albumIds = new Set<string>();
      for (const playlist of playlists) {
        const tracks = await this.getPlaylistTracks(playlist.id);
        tracks.forEach(track => {
          if (track.album?.id) {
            albumIds.add(track.album.id);
          }
        });
      }

      // 3. Get detailed album information
      const albums = await this.getAlbumsDetails(Array.from(albumIds));
      
      // 4. Cache in database with popularity scores
      await this.cacheAlbumsInDatabase(albums, 'popular');
      
      console.log(`Cached ${albums.length} popular albums`);
    } catch (error) {
      console.error('Popular albums cache population failed:', error);
      throw error;
    }
  }

  private static async getFeaturedPlaylists(): Promise<SpotifyPlaylist[]> {
    const token = await SpotifyAuthService.getAccessToken();
    const playlists: SpotifyPlaylist[] = [];
    let offset = 0;
    const limit = 50;

    // Get multiple pages of featured playlists
    while (offset < 500) { // Max 500 playlists
      const response = await fetch(
        `https://api.spotify.com/v1/browse/featured-playlists?limit=${limit}&offset=${offset}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) break;

      const data = await response.json();
      playlists.push(...data.playlists.items);
      
      if (data.playlists.items.length < limit) break;
      offset += limit;
    }

    return playlists;
  }

  private static async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    const token = await SpotifyAuthService.getAccessToken();
    const tracks: SpotifyTrack[] = [];
    let offset = 0;
    const limit = 100;

    while (offset < 1000) { // Max 1000 tracks per playlist
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) break;

      const data = await response.json();
      tracks.push(...data.items.map(item => item.track));
      
      if (data.items.length < limit) break;
      offset += limit;
    }

    return tracks;
  }

  private static async cacheAlbumsInDatabase(albums: SpotifyAlbum[], source: string): Promise<void> {
    const formattedAlbums = albums.map(album => ({
      id: album.id,
      name: album.name,
      artist_name: album.artists[0]?.name || 'Unknown Artist',
      artist_id: album.artists[0]?.id,
      image_url: album.images[0]?.url,
      release_date: album.release_date,
      popularity: album.popularity || 0,
      track_count: album.total_tracks,
      genres: album.genres || [],
      spotify_data: album,
      cache_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: new Date()
    }));

    // Batch insert with conflict resolution
    const { error } = await supabase
      .from('albums')
      .upsert(formattedAlbums, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (error) {
      throw new Error(`Database cache error: ${error.message}`);
    }
  }
}

// Schedule weekly cache update
// In production, this would run as a cron job or scheduled function
setInterval(() => {
  PopularAlbumsCacheService.populateCache().catch(console.error);
}, 7 * 24 * 60 * 60 * 1000); // Weekly
```

### **Tier 2: User-Searched Albums Cache**

#### **Purpose & Strategy**
- **Goal**: Cache albums that users actually search for
- **Size**: Unlimited (managed by expiration)
- **Update Frequency**: On-demand with 30-day expiration
- **Hit Rate Target**: 80-90% of repeat searches

#### **Smart Search Implementation**
```javascript
class SmartSearchService {
  static async searchAlbums(query: string, limit: number = 20): Promise<Album[]> {
    // 1. Sanitize and prepare search query
    const sanitizedQuery = this.sanitizeQuery(query);
    if (sanitizedQuery.length < 2) {
      return [];
    }

    // 2. Search cached albums first (database)
    const cachedResults = await this.searchCachedAlbums(sanitizedQuery, limit);
    
    // 3. If enough results from cache, return them
    if (cachedResults.length >= Math.min(limit, 5)) {
      return cachedResults.slice(0, limit);
    }

    // 4. Search Spotify API for additional results
    const spotifyResults = await this.searchSpotifyAPI(sanitizedQuery, limit);
    
    // 5. Cache new results for future searches
    await this.cacheSearchResults(spotifyResults);
    
    // 6. Combine and deduplicate results
    const combinedResults = this.combineAndDeduplicate(cachedResults, spotifyResults);
    
    return combinedResults.slice(0, limit);
  }

  private static sanitizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  private static async searchCachedAlbums(query: string, limit: number): Promise<Album[]> {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .or(`name.ilike.%${query}%, artist_name.ilike.%${query}%`)
      .gt('cache_expires_at', new Date().toISOString())
      .order('popularity', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Cache search error:', error);
      return [];
    }

    return data || [];
  }

  private static async searchSpotifyAPI(query: string, limit: number): Promise<SpotifyAlbum[]> {
    try {
      const token = await SpotifyAuthService.getAccessToken();
      
      // Apply rate limiting
      await this.rateLimitGuard();
      
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=${limit}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Spotify search failed: ${response.status}`);
      }

      const data = await response.json();
      return data.albums?.items || [];
    } catch (error) {
      console.error('Spotify API search error:', error);
      return [];
    }
  }

  private static async cacheSearchResults(albums: SpotifyAlbum[]): Promise<void> {
    if (albums.length === 0) return;

    const formattedAlbums = albums.map(album => ({
      id: album.id,
      name: album.name,
      artist_name: album.artists[0]?.name || 'Unknown Artist',
      artist_id: album.artists[0]?.id,
      image_url: album.images[0]?.url,
      release_date: album.release_date,
      popularity: album.popularity || 0,
      track_count: album.total_tracks,
      genres: album.genres || [],
      spotify_data: album,
      cache_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: new Date()
    }));

    await supabase
      .from('albums')
      .upsert(formattedAlbums, { onConflict: 'id' });
  }

  private static combineAndDeduplicate(cached: Album[], spotify: SpotifyAlbum[]): Album[] {
    const seen = new Set(cached.map(album => album.id));
    const spotifyFormatted = spotify
      .filter(album => !seen.has(album.id))
      .map(album => this.formatSpotifyAlbum(album));

    return [...cached, ...spotifyFormatted];
  }

  // Rate limiting implementation
  private static lastRequestTime = 0;
  private static requestCount = 0;
  private static readonly RATE_LIMIT = 50; // requests per second
  private static readonly WINDOW_SIZE = 1000; // 1 second window

  private static async rateLimitGuard(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.WINDOW_SIZE) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    // Check if we've exceeded rate limit
    if (this.requestCount >= this.RATE_LIMIT) {
      const waitTime = this.WINDOW_SIZE - (now - this.lastRequestTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }

    this.requestCount++;
  }
}
```

### **Tier 3: Real-time API Fallback**

#### **Purpose & Strategy**
- **Goal**: Handle rare albums and real-time data
- **Coverage**: Complete Spotify catalog
- **Caching**: Immediate cache after API call
- **Use Cases**: New releases, obscure albums, one-off requests

#### **Album Details Service**
```javascript
class AlbumDetailsService {
  static async getAlbumDetails(albumId: string): Promise<Album> {
    // 1. Check cache first
    let album = await this.getCachedAlbum(albumId);
    
    // 2. If not cached or expired, fetch from API
    if (!album || this.isCacheExpired(album)) {
      album = await this.fetchFromSpotifyAPI(albumId);
      await this.cacheAlbum(album);
    }

    return album;
  }

  private static async getCachedAlbum(albumId: string): Promise<Album | null> {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('id', albumId)
      .single();

    if (error || !data) return null;
    return data;
  }

  private static isCacheExpired(album: Album): boolean {
    if (!album.cache_expires_at) return true;
    return new Date(album.cache_expires_at) < new Date();
  }

  private static async fetchFromSpotifyAPI(albumId: string): Promise<Album> {
    try {
      const token = await SpotifyAuthService.getAccessToken();
      
      // Get album details and tracks in parallel
      const [albumResponse, tracksResponse] = await Promise.all([
        fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!albumResponse.ok || !tracksResponse.ok) {
        throw new Error('Failed to fetch album details');
      }

      const [albumData, tracksData] = await Promise.all([
        albumResponse.json(),
        tracksResponse.json()
      ]);

      // Combine album and track data
      return this.formatAlbumWithTracks(albumData, tracksData.items);
    } catch (error) {
      console.error(`Error fetching album ${albumId}:`, error);
      throw error;
    }
  }

  private static formatAlbumWithTracks(album: SpotifyAlbum, tracks: SpotifyTrack[]): Album {
    return {
      id: album.id,
      name: album.name,
      artist_name: album.artists[0]?.name || 'Unknown Artist',
      artist_id: album.artists[0]?.id,
      image_url: album.images[0]?.url,
      release_date: album.release_date,
      popularity: album.popularity || 0,
      track_count: album.total_tracks,
      duration_ms: tracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0),
      genres: album.genres || [],
      tracks: tracks.map(track => ({
        id: track.id,
        name: track.name,
        track_number: track.track_number,
        duration_ms: track.duration_ms,
        artists: track.artists?.map(artist => artist.name).join(', ') || 'Unknown'
      })),
      spotify_data: album,
      cache_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      created_at: new Date()
    };
  }

  private static async cacheAlbum(album: Album): Promise<void> {
    await supabase
      .from('albums')
      .upsert(album, { onConflict: 'id' });
  }
}
```

---

## 📊 **Performance Monitoring & Analytics**

### **API Usage Tracking**
```typescript
class SpotifyAnalyticsService {
  static async trackAPICall(endpoint: string, responseTime: number, success: boolean): Promise<void> {
    const metrics = {
      endpoint,
      response_time_ms: responseTime,
      success,
      timestamp: new Date(),
      environment: process.env.ENVIRONMENT
    };

    // Log to analytics service
    await supabase.functions.invoke('track-spotify-usage', {
      body: metrics
    });
  }

  static async getDailyUsageStats(): Promise<UsageStats> {
    const { data, error } = await supabase
      .from('spotify_usage_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000));

    if (error) throw error;

    return this.calculateUsageStats(data);
  }

  private static calculateUsageStats(logs: any[]): UsageStats {
    return {
      totalRequests: logs.length,
      successRate: logs.filter(log => log.success).length / logs.length,
      averageResponseTime: logs.reduce((sum, log) => sum + log.response_time_ms, 0) / logs.length,
      requestsByEndpoint: this.groupByEndpoint(logs),
      rateLimit: {
        current: this.getCurrentRateUsage(),
        limit: 100, // requests per second
        resetTime: new Date(Date.now() + 60000) // 1 minute
      }
    };
  }
}
```

### **Cache Performance Metrics**
```sql
-- Cache hit rate analysis
WITH cache_stats AS (
  SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_searches,
    COUNT(CASE WHEN cache_expires_at > NOW() THEN 1 END) as cache_hits
  FROM albums 
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY DATE_TRUNC('hour', created_at)
)
SELECT 
  hour,
  total_searches,
  cache_hits,
  ROUND((cache_hits::float / total_searches * 100), 2) as hit_rate_percent
FROM cache_stats
ORDER BY hour DESC;

-- Popular albums performance
SELECT 
  name,
  artist_name,
  popularity,
  created_at,
  cache_expires_at,
  CASE 
    WHEN cache_expires_at > NOW() THEN 'active'
    ELSE 'expired'
  END as cache_status
FROM albums
WHERE popularity > 70
ORDER BY popularity DESC
LIMIT 100;

-- Search query analysis
SELECT 
  SUBSTRING(name, 1, 20) as album_prefix,
  COUNT(*) as search_frequency,
  AVG(popularity) as avg_popularity,
  MAX(created_at) as last_searched
FROM albums
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY SUBSTRING(name, 1, 20)
ORDER BY search_frequency DESC
LIMIT 50;
```

---

## 🚨 **Error Handling & Resilience**

### **API Error Handling**
```javascript
class SpotifyErrorHandler {
  static async handleAPIResponse(response: Response, context: string): Promise<any> {
    if (response.ok) {
      return await response.json();
    }

    const errorData = await response.json().catch(() => null);
    
    switch (response.status) {
      case 401:
        // Token expired - refresh and retry
        await SpotifyAuthService.refreshToken();
        throw new RetryableError('Authentication expired, retrying...');
      
      case 429:
        // Rate limit exceeded
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        
        this.logRateLimit(context, waitTime);
        throw new RateLimitError(`Rate limited, retry after ${waitTime}ms`);
      
      case 403:
        // Forbidden - bad request or policy violation
        this.logError('API_FORBIDDEN', context, errorData);
        throw new APIError('Request forbidden by Spotify');
      
      case 404:
        // Not found - album/track doesn't exist
        return null; // Return null for missing resources
      
      case 500:
      case 502:
      case 503:
        // Server errors - retry with backoff
        throw new RetryableError('Spotify server error, retrying...');
      
      default:
        this.logError('API_UNKNOWN_ERROR', context, errorData);
        throw new APIError(`Spotify API error: ${response.status}`);
    }
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries || !(error instanceof RetryableError)) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  private static logRateLimit(context: string, waitTime: number): void {
    console.warn(`Spotify rate limit hit: ${context}, waiting ${waitTime}ms`);
    
    // Track rate limit events
    supabase.functions.invoke('track-rate-limit', {
      body: {
        context,
        waitTime,
        timestamp: new Date(),
        environment: process.env.ENVIRONMENT
      }
    });
  }

  private static logError(type: string, context: string, errorData: any): void {
    console.error(`Spotify API error: ${type} in ${context}`, errorData);
    
    // Track API errors
    supabase.functions.invoke('track-api-error', {
      body: {
        type,
        context,
        errorData,
        timestamp: new Date(),
        environment: process.env.ENVIRONMENT
      }
    });
  }
}

// Custom error classes
class APIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIError';
  }
}

class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

### **Fallback Strategies**
```javascript
class MusicDataFallbackService {
  static async searchWithFallback(query: string): Promise<Album[]> {
    try {
      // Primary: Spotify API
      return await SmartSearchService.searchAlbums(query);
    } catch (error) {
      console.warn('Spotify search failed, trying fallback...', error);
      
      try {
        // Fallback: MusicBrainz API
        return await this.searchMusicBrainz(query);
      } catch (fallbackError) {
        console.error('All music APIs failed:', fallbackError);
        
        // Final fallback: Cache-only search
        return await this.searchCacheOnly(query);
      }
    }
  }

  private static async searchMusicBrainz(query: string): Promise<Album[]> {
    // MusicBrainz has rate limiting (1 request/second)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(
      `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=20`
    );
    
    if (!response.ok) {
      throw new Error(`MusicBrainz search failed: ${response.status}`);
    }
    
    const data = await response.json();
    return this.formatMusicBrainzResults(data['release-groups'] || []);
  }

  private static async searchCacheOnly(query: string): Promise<Album[]> {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .or(`name.ilike.%${query}%, artist_name.ilike.%${query}%`)
      .order('popularity', { ascending: false })
      .limit(20);

    return data || [];
  }

  private static formatMusicBrainzResults(releases: any[]): Album[] {
    return releases.map(release => ({
      id: release.id,
      name: release.title || 'Unknown Album',
      artist_name: release['artist-credit']?.[0]?.name || 'Unknown Artist',
      image_url: null, // MusicBrainz doesn't provide images
      release_date: release['first-release-date'],
      popularity: 0,
      source: 'musicbrainz',
      musicbrainz_id: release.id
    }));
  }
}
```

---

## 🔧 **Development Tools & Testing**

### **Mock Data for Development**
```javascript
// For offline development and testing
class MockSpotifyService {
  private static mockAlbums: Album[] = [
    {
      id: 'mock-ok-computer',
      name: 'OK Computer',
      artist_name: 'Radiohead',
      image_url: 'https://i.scdn.co/image/mock-ok-computer.jpg',
      popularity: 95,
      tracks: [
        { name: 'Airbag', duration_ms: 284000 },
        { name: 'Paranoid Android', duration_ms: 383000 },
        // ... more tracks
      ]
    },
    // ... more mock albums
  ];

  static async searchAlbums(query: string): Promise<Album[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.mockAlbums.filter(album =>
      album.name.toLowerCase().includes(query.toLowerCase()) ||
      album.artist_name.toLowerCase().includes(query.toLowerCase())
    );
  }

  static async getAlbumDetails(albumId: string): Promise<Album | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return this.mockAlbums.find(album => album.id === albumId) || null;
  }
}

// Environment-based service selection
const MusicService = process.env.ENVIRONMENT === 'development' && process.env.USE_MOCK_DATA
  ? MockSpotifyService
  : SmartSearchService;
```

### **Integration Tests**
```typescript
describe('Spotify Integration', () => {
  beforeAll(async () => {
    // Setup test environment
    await setupTestDatabase();
  });

  describe('Authentication', () => {
    it('should obtain access token', async () => {
      const token = await SpotifyAuthService.getAccessToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should reuse valid tokens', async () => {
      const token1 = await SpotifyAuthService.getAccessToken();
      const token2 = await SpotifyAuthService.getAccessToken();
      expect(token1).toBe(token2);
    });
  });

  describe('Search Functionality', () => {
    it('should search albums by name', async () => {
      const results = await SmartSearchService.searchAlbums('OK Computer');
      expect(results).toHaveLength(greaterThan(0));
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('artist_name');
    });

    it('should handle empty search queries', async () => {
      const results = await SmartSearchService.searchAlbums('');
      expect(results).toHaveLength(0);
    });

    it('should handle non-existent albums', async () => {
      const results = await SmartSearchService.searchAlbums('xyznonsensealbumlkasjdflkj');
      expect(results).toHaveLength(0);
    });
  });

  describe('Caching', () => {
    it('should cache search results', async () => {
      const query = 'Test Album Search';
      
      // First search - should hit API
      const results1 = await SmartSearchService.searchAlbums(query);
      
      // Second search - should hit cache
      const startTime = Date.now();
      const results2 = await SmartSearchService.searchAlbums(query);
      const responseTime = Date.now() - startTime;
      
      expect(results1).toEqual(results2);
      expect(responseTime).toBeLessThan(100); // Cache should be faster
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting gracefully', async () => {
      // Mock rate limit response
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '60']])
      } as any);

      await expect(SmartSearchService.searchAlbums('test'))
        .rejects.toThrow(RateLimitError);
    });
  });
});
```

---

## 📈 **Production Optimization**

### **Performance Benchmarks**
- **Search Response Time**: < 2 seconds (95th percentile)
- **Cache Hit Rate**: > 80% for popular albums
- **API Call Reduction**: 60-70% reduction vs. direct API calls
- **Database Query Time**: < 100ms average

### **Scaling Strategies**
```typescript
// Connection pooling for high-traffic scenarios
class DatabaseConnectionManager {
  private static pool: any = null;

  static async getConnection() {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20, // Maximum connections
        min: 5,  // Minimum connections
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      });
    }
    
    return this.pool;
  }
}

// Background job scheduling for cache maintenance
class CacheMaintenanceScheduler {
  static startScheduledJobs() {
    // Daily cache cleanup
    cron.schedule('0 2 * * *', async () => {
      await this.cleanExpiredCache();
    });

    // Weekly popular albums update
    cron.schedule('0 3 * * 0', async () => {
      await PopularAlbumsCacheService.populateCache();
    });

    // Hourly analytics collection
    cron.schedule('0 * * * *', async () => {
      await this.collectPerformanceMetrics();
    });
  }

  private static async cleanExpiredCache(): Promise<void> {
    const { error } = await supabase
      .from('albums')
      .delete()
      .lt('cache_expires_at', new Date().toISOString());

    if (error) {
      console.error('Cache cleanup failed:', error);
    } else {
      console.log('Expired cache entries cleaned up');
    }
  }
}
```

---

## 📋 **Implementation Checklist**

### **Week 3: Basic Integration**
- [ ] Create Spotify Developer account
- [ ] Implement basic authentication service
- [ ] Create simple search function
- [ ] Test API connectivity
- [ ] Set up environment variables

### **Week 4: Caching Implementation**
- [ ] Design database schema for albums cache
- [ ] Implement Tier 2 caching (user searches)
- [ ] Add error handling and retry logic
- [ ] Create basic performance monitoring
- [ ] Test cache performance

### **Week 6: Advanced Features**
- [ ] Implement Tier 1 caching (popular albums)
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting protection
- [ ] Add MusicBrainz fallback service
- [ ] Performance optimization

### **Production Readiness**
- [ ] Set up monitoring and alerting
- [ ] Configure production API credentials
- [ ] Implement cache maintenance jobs
- [ ] Add comprehensive logging
- [ ] Performance testing and optimization

---

*This integration guide will be updated as we implement features and optimize performance based on real-world usage patterns.*