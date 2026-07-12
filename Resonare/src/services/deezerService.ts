import {
  SpotifySearchResponse,
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyArtistFull,
  SpotifyArtistAlbumsResponse,
  SpotifyArtistAlbumsParams,
  SpotifyImage,
  SpotifyTrack,
  SpotifyPagingObject,
} from '../types/spotify';

/**
 * DeezerService — drop-in provider replacement for SpotifyService.
 *
 * Spotify's Web API now requires the app owner to hold an active Premium
 * subscription; Deezer's public API is keyless and free. To keep the blast
 * radius small, this service adapts Deezer responses into the existing
 * Spotify-shaped types, so SpotifyMapper and every downstream consumer keep
 * working unchanged.
 *
 * ID convention: every album/artist/track id emitted by this service is
 * prefixed with 'dz:' (e.g. 'dz:14879699'). Legacy rows in the database keep
 * their original Spotify ids; the two id spaces can never collide (Spotify
 * ids are 22-char base62 and never contain ':'). Getters accept ids with or
 * without the prefix.
 */

const DEEZER_CONFIG = {
  API_BASE_URL: 'https://api.deezer.com',
  ID_PREFIX: 'dz:',
  RATE_LIMIT: {
    // Deezer allows ~50 requests per 5 seconds per IP
    REQUESTS_PER_SECOND: 8,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },
  SEARCH: {
    DEFAULT_LIMIT: 20,
  },
};

// ---------------------------------------------------------------------------
// Raw Deezer response shapes (internal to this service)
// ---------------------------------------------------------------------------

interface DeezerError {
  error: { type: string; message: string; code: number };
}

interface DeezerArtist {
  id: number;
  name: string;
  link?: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  nb_fan?: number;
}

interface DeezerGenre {
  id: number;
  name: string;
}

interface DeezerTrack {
  id: number;
  title: string;
  duration: number; // seconds
  track_position?: number;
  disk_number?: number;
  explicit_lyrics?: boolean;
  preview?: string;
  link?: string;
  artist?: DeezerArtist;
}

interface DeezerAlbum {
  id: number;
  title: string;
  link?: string;
  upc?: string;
  cover?: string;
  cover_small?: string;
  cover_medium?: string;
  cover_big?: string;
  cover_xl?: string;
  genre_id?: number;
  genres?: { data: DeezerGenre[] };
  nb_tracks?: number;
  release_date?: string; // present on album detail + artist albums, absent on search
  record_type?: string; // 'album' | 'single' | 'ep' | 'compile' ...
  explicit_lyrics?: boolean;
  artist?: DeezerArtist;
  contributors?: DeezerArtist[];
  tracks?: { data: DeezerTrack[] };
}

interface DeezerListResponse<T> {
  data: T[];
  total?: number;
  next?: string;
}

function isDeezerError(response: any): response is DeezerError {
  return !!(response && response.error && response.error.code !== undefined);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DeezerService {
  private static lastRequestTime: number = 0;

  /** Prefix a raw Deezer id for use as an app-wide id. */
  static toAppId(deezerId: number | string): string {
    return `${DEEZER_CONFIG.ID_PREFIX}${deezerId}`;
  }

  /** Strip the 'dz:' prefix (accepts already-raw ids too). */
  static toDeezerId(id: string): string {
    return id.startsWith(DEEZER_CONFIG.ID_PREFIX)
      ? id.slice(DEEZER_CONFIG.ID_PREFIX.length)
      : id;
  }

  /** True when an app-wide id belongs to the Deezer id space. */
  static isDeezerId(id: string): boolean {
    return id.startsWith(DEEZER_CONFIG.ID_PREFIX);
  }

  /**
   * Simple client-side rate limiting (mirrors SpotifyService's approach).
   */
  private static async enforceRateLimit(): Promise<void> {
    return new Promise(resolve => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minInterval = 1000 / DEEZER_CONFIG.RATE_LIMIT.REQUESTS_PER_SECOND;

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
   * Make an API request with retry logic.
   * Note: Deezer returns errors as HTTP 200 with an { error } body, so both
   * HTTP status and body must be checked.
   */
  private static async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T> {
    await this.enforceRateLimit();

    const url = new URL(DEEZER_CONFIG.API_BASE_URL + endpoint);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    for (
      let attempt = 1;
      attempt <= DEEZER_CONFIG.RATE_LIMIT.RETRY_ATTEMPTS;
      attempt++
    ) {
      try {
        const response = await fetch(url.toString(), { method: 'GET' });

        if (!response.ok) {
          throw new Error(
            `Deezer API error: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (isDeezerError(data)) {
          // Code 4 = quota exceeded — worth retrying after a pause
          if (data.error.code === 4) {
            const delay = DEEZER_CONFIG.RATE_LIMIT.RETRY_DELAY * attempt;
            console.warn(
              `Deezer quota exceeded. Waiting ${delay}ms before retry ${attempt}/${DEEZER_CONFIG.RATE_LIMIT.RETRY_ATTEMPTS}`,
            );
            await new Promise<void>(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(
            `Deezer API error: ${data.error.code} - ${data.error.message}`,
          );
        }

        return data as T;
      } catch (error) {
        if (attempt === DEEZER_CONFIG.RATE_LIMIT.RETRY_ATTEMPTS) {
          console.error(
            `Deezer API request failed after ${attempt} attempts:`,
            error,
          );
          throw error;
        }
        console.warn(
          `Deezer API request attempt ${attempt} failed, retrying...`,
          error,
        );
        await new Promise<void>(resolve =>
          setTimeout(resolve, DEEZER_CONFIG.RATE_LIMIT.RETRY_DELAY * attempt),
        );
      }
    }

    throw new Error('Failed to complete Deezer API request');
  }

  // -------------------------------------------------------------------------
  // Deezer -> Spotify shape adapters
  // -------------------------------------------------------------------------

  /** Build a Spotify-style images array (largest first, real dimensions). */
  private static toImages(
    obj: { [key: string]: any },
    kind: 'cover' | 'picture',
  ): SpotifyImage[] {
    const sizes: Array<[string, number]> = [
      [`${kind}_xl`, 1000],
      [`${kind}_big`, 500],
      [`${kind}_medium`, 250],
      [`${kind}_small`, 56],
    ];
    const images: SpotifyImage[] = [];
    for (const [field, dim] of sizes) {
      const urlValue = obj[field];
      if (typeof urlValue === 'string' && urlValue.length > 0) {
        images.push({ url: urlValue, width: dim, height: dim });
      }
    }
    // Fall back to the generic url if no sized variants exist
    if (images.length === 0 && typeof obj[kind] === 'string' && obj[kind]) {
      images.push({ url: obj[kind], width: null, height: null });
    }
    return images;
  }

  /** Deezer record_type -> the album_type values the app/DB accept. */
  private static toAlbumType(
    recordType?: string,
  ): 'album' | 'single' | 'compilation' {
    switch ((recordType || 'album').toLowerCase()) {
      case 'single':
      case 'ep': // DB CHECK constraint has no 'ep'; single is the closest fit
        return 'single';
      case 'compile':
      case 'compilation':
        return 'compilation';
      default:
        return 'album';
    }
  }

  private static toSpotifyArtist(dz: DeezerArtist): SpotifyArtist {
    return {
      id: this.toAppId(dz.id),
      name: dz.name,
      type: 'artist',
      href: '',
      uri: '',
      external_urls: { spotify: dz.link || `https://www.deezer.com/artist/${dz.id}` },
      images: this.toImages(dz, 'picture'),
      followers:
        dz.nb_fan !== undefined ? { href: null, total: dz.nb_fan } : undefined,
    };
  }

  private static toSpotifyArtistFull(dz: DeezerArtist): SpotifyArtistFull {
    return {
      ...this.toSpotifyArtist(dz),
      followers: { href: null, total: dz.nb_fan ?? 0 },
      genres: [], // Deezer artists carry no genres
      images: this.toImages(dz, 'picture'),
      popularity: 0, // no Spotify-style 0-100 popularity on Deezer
    };
  }

  private static toSpotifyTrack(
    dz: DeezerTrack,
    albumArtist?: DeezerArtist,
    positionFallback?: number,
  ): SpotifyTrack {
    const artist = dz.artist || albumArtist;
    return {
      id: this.toAppId(dz.id),
      name: dz.title,
      duration_ms: (dz.duration || 0) * 1000, // Deezer uses seconds
      // Tracks embedded in album detail lack track_position (only the
      // dedicated /album/{id}/tracks endpoint has it) — fall back to index
      track_number: dz.track_position ?? positionFallback ?? 0,
      disc_number: dz.disk_number || 1,
      explicit: !!dz.explicit_lyrics,
      preview_url: dz.preview || null,
      artists: artist ? [this.toSpotifyArtist(artist)] : [],
      available_markets: [],
      external_urls: { spotify: dz.link || '' },
      href: '',
      is_local: false,
      type: 'track',
      uri: '',
    };
  }

  private static toSpotifyAlbum(dz: DeezerAlbum): SpotifyAlbum {
    const artists: SpotifyArtist[] =
      dz.contributors && dz.contributors.length > 0
        ? dz.contributors.map(c => this.toSpotifyArtist(c))
        : dz.artist
          ? [this.toSpotifyArtist(dz.artist)]
          : [];

    const genres =
      dz.genres?.data?.map(g => g.name).filter(name => !!name) || undefined;

    let tracks: SpotifyPagingObject<SpotifyTrack> | undefined;
    if (dz.tracks?.data) {
      const items = dz.tracks.data.map((t, i) =>
        this.toSpotifyTrack(t, dz.artist, i + 1),
      );
      tracks = {
        href: '',
        items,
        limit: items.length,
        next: null,
        offset: 0,
        previous: null,
        total: items.length,
      };
    }

    return {
      id: this.toAppId(dz.id),
      name: dz.title,
      album_type: this.toAlbumType(dz.record_type),
      total_tracks: dz.nb_tracks ?? dz.tracks?.data?.length ?? 0,
      release_date: dz.release_date || '', // absent on search results; detail fetch fills it
      release_date_precision: 'day',
      images: this.toImages(dz, 'cover'),
      artists,
      genres,
      tracks,
      external_ids: dz.upc ? { upc: dz.upc } : undefined,
      external_urls: { spotify: dz.link || `https://www.deezer.com/album/${dz.id}` },
      available_markets: [],
      href: '',
      type: 'album',
      uri: '',
    };
  }

  // -------------------------------------------------------------------------
  // Public API — mirrors SpotifyService
  // -------------------------------------------------------------------------

  /**
   * Search albums or artists (Spotify-style union response).
   */
  static async search(params: {
    q: string;
    type: string;
    limit?: number;
    offset?: number;
  }): Promise<SpotifySearchResponse> {
    if (params.type === 'artist') {
      return this.searchArtists(params.q, params.limit, params.offset);
    }
    return this.searchAlbums(params.q, params.limit, params.offset);
  }

  /**
   * Search specifically for albums.
   * Note: Deezer search results omit release_date; it is populated by the
   * album-detail fetch that happens before any database insert.
   */
  static async searchAlbums(
    query: string,
    limit: number = DEEZER_CONFIG.SEARCH.DEFAULT_LIMIT,
    offset: number = 0,
  ): Promise<SpotifySearchResponse> {
    const response = await this.makeRequest<DeezerListResponse<DeezerAlbum>>(
      '/search/album',
      {
        q: query,
        limit: limit.toString(),
        index: offset.toString(),
      },
    );

    const items = (response.data || []).map(album =>
      this.toSpotifyAlbum(album),
    );

    return {
      albums: {
        href: '',
        items,
        limit,
        next: response.next || null,
        offset,
        previous: null,
        total: response.total ?? items.length,
      },
    };
  }

  /**
   * Search specifically for artists.
   */
  static async searchArtists(
    query: string,
    limit: number = DEEZER_CONFIG.SEARCH.DEFAULT_LIMIT,
    offset: number = 0,
  ): Promise<SpotifySearchResponse> {
    const response = await this.makeRequest<DeezerListResponse<DeezerArtist>>(
      '/search/artist',
      {
        q: query,
        limit: limit.toString(),
        index: offset.toString(),
      },
    );

    const items = (response.data || []).map(artist =>
      // Full shape so SpotifyMapper.isValidSpotifyArtist / mapArtistToDatabase work
      this.toSpotifyArtistFull(artist),
    );

    return {
      artists: {
        href: '',
        items,
        limit,
        next: response.next || null,
        offset,
        previous: null,
        total: response.total ?? items.length,
      },
    };
  }

  /**
   * Get album details by id (accepts 'dz:123' or '123').
   * Includes tracks, genres, and UPC.
   */
  static async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    const dzAlbum = await this.makeRequest<DeezerAlbum>(
      `/album/${this.toDeezerId(albumId)}`,
    );
    return this.toSpotifyAlbum(dzAlbum);
  }

  /**
   * Look an album up by UPC barcode — the cross-provider dedup key.
   * Returns null when Deezer has no album for that UPC.
   */
  static async getAlbumByUpc(upc: string): Promise<SpotifyAlbum | null> {
    try {
      const dzAlbum = await this.makeRequest<DeezerAlbum>(`/album/upc:${upc}`);
      return this.toSpotifyAlbum(dzAlbum);
    } catch (error) {
      // Deezer answers "no data" (code 800) for unknown UPCs
      if (error instanceof Error && error.message.includes('800')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get multiple albums (Deezer has no batch endpoint; fetches sequentially
   * through the rate limiter).
   */
  static async getMultipleAlbums(params: {
    ids: string[];
  }): Promise<{ albums: SpotifyAlbum[] }> {
    const albums: SpotifyAlbum[] = [];
    for (const id of params.ids) {
      try {
        albums.push(await this.getAlbum(id));
      } catch (error) {
        console.warn(`Failed to fetch Deezer album ${id}:`, error);
      }
    }
    return { albums };
  }

  /**
   * Get album tracks.
   */
  static async getAlbumTracks(
    albumId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<SpotifyPagingObject<SpotifyTrack>> {
    const response = await this.makeRequest<DeezerListResponse<DeezerTrack>>(
      `/album/${this.toDeezerId(albumId)}/tracks`,
      { limit: limit.toString(), index: offset.toString() },
    );

    const items = (response.data || []).map(t => this.toSpotifyTrack(t));
    return {
      href: '',
      items,
      limit,
      next: response.next || null,
      offset,
      previous: null,
      total: response.total ?? items.length,
    };
  }

  /**
   * Get artist details by id (accepts 'dz:123' or '123').
   */
  static async getArtist(artistId: string): Promise<SpotifyArtistFull> {
    const dzArtist = await this.makeRequest<DeezerArtist>(
      `/artist/${this.toDeezerId(artistId)}`,
    );
    return this.toSpotifyArtistFull(dzArtist);
  }

  /**
   * Get an artist's albums (Deezer artist albums include release_date).
   */
  static async getArtistAlbums(
    artistId: string,
    params?: SpotifyArtistAlbumsParams,
  ): Promise<SpotifyArtistAlbumsResponse> {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const response = await this.makeRequest<DeezerListResponse<DeezerAlbum>>(
      `/artist/${this.toDeezerId(artistId)}/albums`,
      { limit: limit.toString(), index: offset.toString() },
    );

    // Deezer returns artist albums without the nested artist object; attach
    // the artist so mapped albums carry a usable artist id/name.
    let artist: DeezerArtist | undefined;
    try {
      artist = await this.makeRequest<DeezerArtist>(
        `/artist/${this.toDeezerId(artistId)}`,
      );
    } catch {
      artist = undefined;
    }

    const items = (response.data || []).map(album =>
      this.toSpotifyAlbum(artist ? { ...album, artist } : album),
    );

    return {
      href: '',
      items,
      limit,
      next: response.next || null,
      offset,
      previous: null,
      total: response.total ?? items.length,
    };
  }

  /**
   * Deezer's public API needs no credentials — always configured.
   */
  static isConfigured(): boolean {
    return true;
  }

  /**
   * No auth state to clear; kept for interface parity with SpotifyService.
   */
  static clearAuth(): void {}
}
