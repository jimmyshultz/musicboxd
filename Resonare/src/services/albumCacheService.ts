import { supabase } from './supabase';
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

      // 2. A row with the same UPC (a legacy Spotify-keyed row) — reuse it as
      //    the canonical row. We intentionally do NOT stamp deezer_id here:
      //    the `albums` table is write-once (no UPDATE RLS policy, by design),
      //    and the one-time backfill already stamps deezer_id as service-role.
      //    This path is a rare post-backfill fallback; correctness (no dup) is
      //    preserved by returning the existing row's id.
      if (upc) {
        const byUpc = await this.findId('albums', 'upc', upc);
        if (byUpc) return byUpc;
      }

      // 3. No existing match — insert a new canonical 'dz:' row.
      const dbAlbum = SpotifyMapper.mapAlbumToDatabase(dzAlbum);
      const primaryArtist = dzAlbum.artists[0];
      if (primaryArtist?.id) {
        // Point the album at the canonical artist row (may resolve to a
        // pre-existing Spotify-keyed artist). null means the artist couldn't be
        // persisted — leave artist_id null rather than dangling the FK.
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

    // Legacy Spotify id not in the DB: nothing to fetch (the Spotify API is
    // gone). It is already cached for any album the user can reach, so just
    // return it unchanged.
    return albumId;
  }

  /**
   * Ensure an artist exists and return its canonical id. Artists have no UPC,
   * so dedup is by exact id then deezer_id (populated by the backfill).
   */
  async ensureArtistExists(
    artistId: string,
    artistHint?: SpotifyArtist,
  ): Promise<string | null> {
    const cached = this.resolvedArtists.get(artistId);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL_MS) {
      return cached.canonicalId;
    }

    try {
      const canonicalId = await this.resolveArtist(artistId, artistHint);
      // Only cache (and hand back) an id we actually confirmed a row for.
      if (canonicalId) {
        this.resolvedArtists.set(artistId, { canonicalId, ts: Date.now() });
      }
      return canonicalId;
    } catch (error) {
      console.error('Error ensuring artist exists:', error);
      // Can't guarantee a row exists — return null rather than an id that would
      // dangle as a foreign key on the album we're about to insert.
      return null;
    }
  }

  /**
   * Resolve an artist to a canonical row id, or null when no row can be
   * guaranteed. Callers must treat null as "leave the album's artist_id unset"
   * — never persist an id whose row does not exist.
   */
  private async resolveArtist(
    artistId: string,
    artistHint?: SpotifyArtist,
  ): Promise<string | null> {
    if (await this.rowExists('artists', 'id', artistId)) {
      return artistId;
    }

    if (DeezerService.isDeezerId(artistId)) {
      const deezerId = DeezerService.toDeezerId(artistId);

      const byDeezer = await this.findId('artists', 'deezer_id', deezerId);
      if (byDeezer) return byDeezer;

      // Insert a new artist row. Prefer full detail; fall back to the hint
      // carried on the album's artist object.
      let insertError: { message?: string } | null = null;
      try {
        const fullArtist = await DeezerService.getArtist(artistId);
        const dbArtist = SpotifyMapper.mapArtistToDatabase(fullArtist);
        const res = await supabase
          .from('artists')
          .upsert(dbArtist, { onConflict: 'id' });
        insertError = res.error;
      } catch (error) {
        console.warn('Deezer artist fetch failed, inserting minimal row:', error);
        const res = await supabase.from('artists').upsert(
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
        insertError = res.error;
      }

      if (insertError) {
        // The insert failed — most likely a deezer_id unique-constraint
        // collision with a row backfilled between our earlier check and now.
        // Resolve to whoever owns this deezer_id instead of returning an id
        // with no row behind it.
        const owner = await this.findId('artists', 'deezer_id', deezerId);
        if (owner) return owner;
        console.warn('Could not persist artist row:', insertError.message);
        return null;
      }

      return artistId; // dz:<deezerId>
    }

    // Legacy Spotify artist id not in the DB and not a Deezer id: we can't
    // create it (the Spotify API is gone) and there's no row to point at, so
    // signal "unresolved" rather than returning a dangling id.
    return null;
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
