/// <reference types="node" />
/**
 * One-time backfill: stamp `upc` + `deezer_id` onto existing Spotify-keyed
 * albums/artists so the Spotify -> Deezer migration de-duplicates cleanly.
 *
 * Must run while the Spotify API still works (UPC is the strongest match key).
 * Writes require the SERVICE ROLE key because `albums` has no UPDATE RLS policy.
 *
 * Reuses the real DeezerService so matching is identical to app runtime.
 *
 * Usage (dev first, then prod):
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   SPOTIFY_CLIENT_ID=eff2e373cb4048ecadc8d01734b7c714 \
 *   SPOTIFY_CLIENT_SECRET=59813eadc08e42dc9accbcbba934dfb2 \
 *   [DRY_RUN=1] [LIMIT=50] \
 *   npx tsx scripts/backfill-deezer-ids.ts
 */
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';
import { writeFileSync } from 'fs';
import { DeezerService } from '../src/services/deezerService';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SPOTIFY_CLIENT_ID = 'eff2e373cb4048ecadc8d01734b7c714',
  SPOTIFY_CLIENT_SECRET = '59813eadc08e42dc9accbcbba934dfb2',
  DRY_RUN,
  LIMIT,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See header for usage.',
  );
  process.exit(1);
}
const dryRun = !!DRY_RUN;
const limit = LIMIT ? parseInt(LIMIT, 10) : Infinity;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** fetch with a hard timeout so a stalled request can never hang the run. */
async function fetchT(url: string, init?: RequestInit, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Normalize a title/artist for fuzzy comparison. */
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '') // drop (Deluxe), [Remaster], ...
    .replace(/\b(deluxe|remaster(ed)?|expanded|explicit|edition|version)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titlesMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// --- Spotify (client-credentials) for UPCs ---------------------------------

let spotifyToken: string | null = null;
let spotifyDead = false;

async function getSpotifyToken(): Promise<string | null> {
  if (spotifyToken) return spotifyToken;
  if (spotifyDead) return null;
  try {
    const auth = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
    ).toString('base64');
    const res = await fetchT('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    spotifyToken = data.access_token || null;
    return spotifyToken;
  } catch {
    return null;
  }
}

/** Batch-fetch UPCs from Spotify for up to 20 album ids. id -> upc|null. */
async function fetchSpotifyUpcs(
  ids: string[],
  retried = false,
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (spotifyDead || ids.length === 0) return out;
  const token = await getSpotifyToken();
  if (!token) return out;

  // Only real-looking Spotify ids (22-char base62); skip dz:/mock ids.
  const valid = ids.filter(id => /^[A-Za-z0-9]{22}$/.test(id));
  if (valid.length === 0) return out;

  try {
    const res = await fetchT(
      `https://api.spotify.com/v1/albums?ids=${valid.join(',')}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 401 && !retried) {
      spotifyToken = null; // refresh token and retry exactly once
      return fetchSpotifyUpcs(ids, true);
    }
    if (res.status === 403) {
      console.warn(
        '  ! Spotify 403 (Premium required / lapsed). Falling back to fuzzy matching for the rest.',
      );
      spotifyDead = true;
      return out;
    }
    if (!res.ok) return out;
    const data = await res.json();
    for (const album of data.albums || []) {
      if (album?.id) out.set(album.id, album.external_ids?.upc || null);
    }
  } catch (e) {
    console.warn('  ! Spotify album fetch failed:', (e as Error).message);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Album backfill
// ---------------------------------------------------------------------------

interface AlbumRow {
  id: string;
  name: string;
  artist_name: string | null;
  artist_id: string | null;
  upc: string | null;
  deezer_id: string | null;
  total_tracks: number | null;
}

async function loadAlbums(): Promise<AlbumRow[]> {
  // Probe whether the upc/deezer_id columns exist yet (they may not on a
  // not-yet-migrated project — e.g. a prod dry-run preview before step 10).
  const probe = await supabase.from('albums').select('deezer_id').limit(1);
  const migrated = !probe.error;
  if (!migrated) {
    console.warn(
      '  ! upc/deezer_id columns not present on this project yet — running in ' +
        'preview mode (all rows scanned; a real run needs the migration first).\n',
    );
  }

  const rows: AlbumRow[] = [];
  const pageSize = 1000;
  const cols = migrated
    ? 'id, name, artist_name, artist_id, upc, deezer_id, total_tracks'
    : 'id, name, artist_name, artist_id, total_tracks';

  for (let from = 0; ; from += pageSize) {
    let query = supabase.from('albums').select(cols);
    if (migrated) query = query.is('deezer_id', null); // resumable: skip done
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(
      ...(data as any[]).map(r => ({
        upc: null,
        deezer_id: null,
        ...r,
      })) as AlbumRow[],
    );
    if (data.length < pageSize) break;
  }
  return rows;
}

// spotify artist id -> deezer artist id, harvested from matched albums
const artistDeezerMap = new Map<string, string>();

const stats = {
  albumsTotal: 0,
  matchedByUpc: 0,
  matchedByFuzzy: 0,
  unmatched: 0,
  upcOnly: 0, // got a UPC but no Deezer album
};
const unmatched: Array<{ id: string; name: string; artist: string | null }> = [];

async function resolveAlbum(
  album: AlbumRow,
  spotifyUpc: string | null,
): Promise<{ upc: string | null; deezerId: string | null; via: string }> {
  const upc = album.upc || spotifyUpc || null;

  // 1. Exact match via UPC (strongest)
  if (upc) {
    try {
      const byUpc = await DeezerService.getAlbumByUpc(upc);
      if (byUpc) {
        harvestArtist(album, byUpc);
        return { upc, deezerId: DeezerService.toDeezerId(byUpc.id), via: 'upc' };
      }
    } catch (e) {
      console.warn(`    upc lookup failed for ${album.id}:`, (e as Error).message);
    }
  }

  // 2. Fuzzy fallback: search Deezer by "artist name" and match title+tracks
  try {
    const query = `${album.artist_name || ''} ${album.name}`.trim();
    const search = await DeezerService.searchAlbums(query, 5);
    for (const cand of search.albums?.items || []) {
      if (!titlesMatch(album.name, cand.name)) continue;
      const candArtist = cand.artists[0]?.name || '';
      if (album.artist_name && !titlesMatch(album.artist_name, candArtist)) continue;
      if (
        album.total_tracks &&
        cand.total_tracks &&
        Math.abs(album.total_tracks - cand.total_tracks) > 2
      ) {
        continue;
      }
      harvestArtist(album, cand);
      return { upc, deezerId: DeezerService.toDeezerId(cand.id), via: 'fuzzy' };
    }
  } catch (e) {
    console.warn(`    fuzzy search failed for ${album.id}:`, (e as Error).message);
  }

  return { upc, deezerId: null, via: 'none' };
}

function harvestArtist(album: AlbumRow, deezerAlbum: { artists: { id: string }[] }) {
  const deezerArtistId = deezerAlbum.artists[0]?.id;
  if (album.artist_id && deezerArtistId && !artistDeezerMap.has(album.artist_id)) {
    artistDeezerMap.set(album.artist_id, DeezerService.toDeezerId(deezerArtistId));
  }
}

async function backfillAlbums() {
  console.log('Loading albums needing backfill (deezer_id IS NULL)...');
  const albums = (await loadAlbums()).slice(0, limit);
  stats.albumsTotal = albums.length;
  console.log(`  ${albums.length} albums to process. dryRun=${dryRun}\n`);

  for (let i = 0; i < albums.length; i += 20) {
    const batch = albums.slice(i, i + 20);
    const upcMap = await fetchSpotifyUpcs(batch.map(a => a.id));

    for (const album of batch) {
      const { upc, deezerId, via } = await resolveAlbum(
        album,
        upcMap.get(album.id) ?? null,
      );

      if (via === 'upc') stats.matchedByUpc++;
      else if (via === 'fuzzy') stats.matchedByFuzzy++;
      else {
        stats.unmatched++;
        if (upc) stats.upcOnly++;
        unmatched.push({ id: album.id, name: album.name, artist: album.artist_name });
      }

      if (!dryRun && (upc !== album.upc || deezerId)) {
        const { error } = await supabase
          .from('albums')
          .update({
            upc: upc,
            deezer_id: deezerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', album.id);
        if (error) console.warn(`    write failed for ${album.id}:`, error.message);
      }
    }

    const done = Math.min(i + 20, albums.length);
    process.stdout.write(
      `  ${done}/${albums.length}  (upc:${stats.matchedByUpc} fuzzy:${stats.matchedByFuzzy} unmatched:${stats.unmatched})\r`,
    );
    await sleep(200); // gentle on both APIs
  }
  console.log('\n');
}

// ---------------------------------------------------------------------------
// Artist backfill
// ---------------------------------------------------------------------------

const artistStats = { total: 0, matchedFromAlbums: 0, matchedByName: 0, unmatched: 0 };

async function backfillArtists() {
  console.log('Backfilling artists (deezer_id IS NULL)...');

  // Probe once whether the column exists (preview mode on unmigrated project)
  const probe = await supabase.from('artists').select('deezer_id').limit(1);
  if (probe.error) {
    console.warn('  ! skipping artists (deezer_id column not present yet)\n');
    return;
  }

  // Paginate — a single select is capped at PostgREST's default 1000 rows.
  const artists: Array<{ id: string; name: string }> = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name, deezer_id')
      .is('deezer_id', null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    artists.push(...(data as Array<{ id: string; name: string }>));
    if (data.length < pageSize) break;
  }
  artistStats.total = artists.length;

  let processed = 0;
  for (const artist of artists) {
    let deezerId: string | null = artistDeezerMap.get(artist.id) || null;
    if (deezerId) {
      // Harvested from a matched album — exact, trustworthy.
      artistStats.matchedFromAlbums++;
    } else {
      // Fallback: name search. Require EXACT normalized-name equality — for an
      // artist there is no other signal, so substring matches risk mapping to
      // the wrong artist. Ambiguous names are safely left unmatched (null).
      try {
        const search = await DeezerService.searchArtists(artist.name, 1);
        const top = search.artists?.items?.[0];
        if (top && norm(artist.name) === norm(top.name)) {
          deezerId = DeezerService.toDeezerId(top.id);
          artistStats.matchedByName++;
        }
      } catch {
        /* ignore */
      }
    }

    processed++;
    if (processed % 100 === 0) {
      process.stdout.write(
        `  ${processed}/${artists.length}  (albums:${artistStats.matchedFromAlbums} name:${artistStats.matchedByName} unmatched:${artistStats.unmatched})\r`,
      );
    }

    if (!deezerId) {
      artistStats.unmatched++;
      continue;
    }
    if (!dryRun) {
      const { error: upErr } = await supabase
        .from('artists')
        .update({ deezer_id: deezerId, updated_at: new Date().toISOString() })
        .eq('id', artist.id);
      if (upErr) console.warn(`    artist write failed ${artist.id}:`, upErr.message);
    }
  }
  console.log('\n');
}

// ---------------------------------------------------------------------------

(async () => {
  const target = new URL(SUPABASE_URL).host.split('.')[0];
  console.log(`\n=== Deezer backfill  (project: ${target}, dryRun: ${dryRun}) ===\n`);

  await backfillAlbums();
  await backfillArtists();

  console.log('=== SUMMARY ===');
  console.log('Albums processed :', stats.albumsTotal);
  console.log('  matched by UPC :', stats.matchedByUpc);
  console.log('  matched fuzzy  :', stats.matchedByFuzzy);
  console.log('  unmatched      :', stats.unmatched, `(of which ${stats.upcOnly} had a UPC but no Deezer album)`);
  const total = stats.matchedByUpc + stats.matchedByFuzzy;
  const pct = stats.albumsTotal ? ((total / stats.albumsTotal) * 100).toFixed(1) : '0';
  console.log(`  match rate     : ${pct}%`);
  console.log('Artists processed:', artistStats.total);
  console.log('  from albums    :', artistStats.matchedFromAlbums);
  console.log('  by name search :', artistStats.matchedByName);
  console.log('  unmatched      :', artistStats.unmatched);

  if (unmatched.length) {
    const path = 'scripts/backfill-unmatched.json';
    writeFileSync(path, JSON.stringify(unmatched, null, 2));
    console.log(`\nWrote ${unmatched.length} unmatched albums to ${path} for review.`);
  }
  console.log(dryRun ? '\n(DRY RUN — no writes performed)\n' : '\nDone.\n');
  process.exit(0);
})().catch(err => {
  console.error('\nBackfill failed:', err?.message || err);
  process.exit(1);
});
