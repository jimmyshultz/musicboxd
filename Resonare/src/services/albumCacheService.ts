import { supabase } from './supabase';
import { SpotifyService } from './spotifyService';
import { DeezerService } from './deezerService';
import { SpotifyMapper } from './spotifyMapper';
import { SpotifyArtist } from '../types/spotify';

/**
 * Centralized service for ensuring albums (and their artists) exist in the
 * database, with cross-provider de-duplication and in-memory caching.
 *
 * The app is migrating its catalog source from Spotify to Deezer. Existing
 * rows are keyed by Spotify ids; new content discovered via Deezer carries
 * 'dz:'-prefixed ids. To avoid the same album/artist existing under two ids,
 * `ensureAlbumExists` resolves an incoming id to the CANONICAL row id and
 * returns it — callers must use the returned id as the foreign key.
 *
 * Resolution order for a Deezer id:
 *   1. a row already linked to this deezer_id  (set by the one-time backfill)
 *   2. a row with the same UPC barcode          (adopt it; stamp deezer_id)
 *   3. otherwise insert a new 'dz:' row
 */
class AlbumCacheService {
  // input id -> { canonicalId, ts }
  private resolvedAlbums = new Map<string, { canonicalId: string; ts: number }>();
  private resolvedArtists = new Map<string, { canonicalId: string; ts: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Ensure an album exists in the albums table and return its canonical id.
   * The returned id may differ from the input when the incoming (e.g. Deezer)
   * album resolves to a pre-existing row under a different id.
   */
  async ensureAlbumExists(albumId: string): Promise<string> {
    const cached = this.resolvedAlbums.get(albumId);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL_MS) {
      return cached.canonicalId;
    }

    try {
      const canonicalId = await this.resolveAlbum(albumId);
      this.resolvedAlbums.set(albumId, { canonicalId, ts: Date.now() });
      return canonicalId;
    } catch (error) {
      console.error('Error ensuring album exists:', error);
      throw error;
    }
  }

  private async resolveAlbum(albumId: string): Promise<string> {
    // 0. Exact row already present (legacy Spotify taps + already-inserted dz rows)
    if (await this.rowExists('albums', 'id', albumId)) {
      return albumId;
    }

    // Deezer id → run cross-provider dedup
    if (DeezerService.isDeezerId(albumId)) {
      const deezerId = DeezerService.toDeezerId(albumId);

      // 1. A row already linked to this deezer_id (typically a backfilled
      //    legacy Spotify row) — reuse its canonical id.
      const byDeezer = await this.findId('albums', 'deezer_id', deezerId);
      if (byDeezer) return byDeezer;

      // Fetch the full Deezer album (carries UPC + tracks).
      const dzAlbum = await DeezerService.getAlbum(albumId);
      const upc = dzAlbum.external_ids?.upc;

      // 2. A row with the same UPC (backfilled legacy row that had no Deezer
      //    match at backfill time) — adopt it and stamp the deezer_id.
      if (upc) {
        const byUpc = await this.findRow('albums', 'upc', upc, 'id, deezer_id');
        if (byUpc) {
          if (!byUpc.deezer_id) {
            await supabase
              .from('albums')
              .update({ deezer_id: deezerId, updated_at: new Date().toISOString() })
              .eq('id', byUpc.id);
          }
          return byUpc.id as string;
        }
      }

      // 3. No existing match — insert a new canonical 'dz:' row.
      const dbAlbum = SpotifyMapper.mapAlbumToDatabase(dzAlbum);
      const primaryArtist = dzAlbum.artists[0];
      if (primaryArtist?.id) {
        // Point the album at the canonical artist row (may resolve to a
        // pre-existing Spotify-keyed artist).
        dbAlbum.artist_id = await this.ensureArtistExists(
          primaryArtist.id,
          primaryArtist,
        );
      }
      const { error } = await supabase
        .from('albums')
        .upsert(dbAlbum, { onConflict: 'id' });
      if (error) throw error;

      return albumId; // dz:<deezerId>
    }

    // Legacy Spotify id not in DB. Post-migration the Spotify API is dead, so
    // this is best-effort only (kept so nothing regresses during transition).
    if (SpotifyService.isConfigured()) {
      try {
        const spotifyAlbum = await SpotifyService.getAlbum(albumId);
        const dbAlbum = SpotifyMapper.mapAlbumToDatabase(spotifyAlbum);
        const { error } = await supabase
          .from('albums')
          .upsert(dbAlbum, { onConflict: 'id' });
        if (error) throw error;
      } catch (error) {
        console.warn(
          'Spotify album fetch failed (expected once Premium lapses):',
          error,
        );
      }
    }
    return albumId;
  }

  /**
   * Ensure an artist exists and return its canonical id. Artists have no UPC,
   * so dedup is by exact id then deezer_id (populated by the backfill).
   */
  async ensureArtistExists(
    artistId: string,
    artistHint?: SpotifyArtist,
  ): Promise<string> {
    const cached = this.resolvedArtists.get(artistId);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL_MS) {
      return cached.canonicalId;
    }

    try {
      const canonicalId = await this.resolveArtist(artistId, artistHint);
      this.resolvedArtists.set(artistId, { canonicalId, ts: Date.now() });
      return canonicalId;
    } catch (error) {
      console.error('Error ensuring artist exists:', error);
      // Non-fatal: fall back to the incoming id so album inserts still proceed.
      return artistId;
    }
  }

  private async resolveArtist(
    artistId: string,
    artistHint?: SpotifyArtist,
  ): Promise<string> {
    if (await this.rowExists('artists', 'id', artistId)) {
      return artistId;
    }

    if (DeezerService.isDeezerId(artistId)) {
      const deezerId = DeezerService.toDeezerId(artistId);

      const byDeezer = await this.findId('artists', 'deezer_id', deezerId);
      if (byDeezer) return byDeezer;

      // Insert a new artist row. Prefer full detail; fall back to the hint
      // carried on the album's artist object.
      try {
        const fullArtist = await DeezerService.getArtist(artistId);
        const dbArtist = SpotifyMapper.mapArtistToDatabase(fullArtist);
        await supabase.from('artists').upsert(dbArtist, { onConflict: 'id' });
      } catch (error) {
        console.warn('Deezer artist fetch failed, inserting minimal row:', error);
        await supabase.from('artists').upsert(
          {
            id: artistId,
            name: artistHint?.name || 'Unknown Artist',
            image_url: artistHint?.images?.[0]?.url || null,
            spotify_url: artistHint?.external_urls?.spotify || null,
            genres: [],
            follower_count: artistHint?.followers?.total || null,
            popularity: null,
            deezer_id: deezerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );
      }
      return artistId; // dz:<deezerId>
    }

    // Legacy Spotify artist id not in DB: leave as-is. It is typically created
    // by ArtistService when the artist page is opened.
    return artistId;
  }

  // ---------------------------------------------------------------------------
  // Query helpers
  // ---------------------------------------------------------------------------

  private async rowExists(
    table: 'albums' | 'artists',
    column: string,
    value: string,
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(column, value)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  private async findId(
    table: 'albums' | 'artists',
    column: string,
    value: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(column, value)
      .limit(1)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.id ?? null;
  }

  private async findRow(
    table: 'albums' | 'artists',
    column: string,
    value: string,
    columns: string,
  ): Promise<Record<string, any> | null> {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq(column, value)
      .limit(1)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return (data as Record<string, any> | null) ?? null;
  }

  /**
   * Clear the in-memory caches (testing / invalidation).
   */
  clearCache(): void {
    this.resolvedAlbums.clear();
    this.resolvedArtists.clear();
  }

  /**
   * Cache statistics for monitoring.
   */
  getCacheStats(): { albums: number; artists: number; ttlMs: number } {
    return {
      albums: this.resolvedAlbums.size,
      artists: this.resolvedArtists.size,
      ttlMs: this.CACHE_TTL_MS,
    };
  }
}

export const albumCacheService = new AlbumCacheService();
