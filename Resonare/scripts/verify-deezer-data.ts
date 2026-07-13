/* eslint-disable no-console */
/**
 * Data-quality harness for the Spotify -> Deezer migration.
 * Runs the REAL DeezerService + SpotifyMapper against live Deezer data for a
 * deliberately diverse set of albums/artists and reports what would be stored,
 * flagging any missing fields the app depends on.
 *
 * Run:  npx tsx scripts/verify-deezer-data.ts
 */
import { DeezerService } from '../src/services/deezerService';
import { SpotifyMapper } from '../src/services/spotifyMapper';

const ALBUM_QUERIES = [
  'Radiohead OK Computer', // mainstream rock, has UPC
  'Beyonce Renaissance', // recent pop
  'Kendrick Lamar good kid maad city', // hip-hop, long title
  'Taylor Swift The Man', // likely a single
  'Bad Bunny Un Verano Sin Ti', // non-English, huge
  'Sault 7', // obscure / hard to find
  'Various Artists Guardians of the Galaxy', // compilation / soundtrack
  'Boygenius the record', // indie, newer band
  'Sigur Ros Agaetis Byrjun', // non-English artist name w/ accents
];

const ARTIST_QUERIES = ['Radiohead', 'Bad Bunny', 'Sault'];

type Row = Record<string, any>;

function flagAlbum(row: Row): string[] {
  const gaps: string[] = [];
  if (!row.upc) gaps.push('NO_UPC');
  if (!row.release_date) gaps.push('NO_RELEASE_DATE');
  if (!row.image_url || row.image_url.includes('placeholder'))
    gaps.push('NO_IMAGE');
  if (!row.artist_id) gaps.push('NO_ARTIST_ID');
  if (!row.total_tracks) gaps.push('NO_TRACK_COUNT');
  if (!row.genres || row.genres.length === 0 || row.genres[0] === 'Music')
    gaps.push('NO_GENRES');
  return gaps;
}

async function verifyAlbums() {
  console.log('\n=================== ALBUM DATA ===================\n');
  let upcCount = 0;
  let total = 0;

  for (const q of ALBUM_QUERIES) {
    try {
      const search = await DeezerService.searchAlbums(q, 1);
      const top = search.albums?.items?.[0];
      if (!top) {
        console.log(`❌ "${q}"  -> NO RESULT ON DEEZER`);
        continue;
      }
      // Search results omit release_date/genres/upc — detail fetch fills them
      const detail = await DeezerService.getAlbum(top.id);
      const row = SpotifyMapper.mapAlbumToDatabase(detail);
      const gaps = flagAlbum(row);
      total++;
      if (row.upc) upcCount++;

      console.log(`▶ "${q}"`);
      console.log(`    id:          ${row.id}`);
      console.log(`    name:        ${row.name}`);
      console.log(`    artist_name: ${row.artist_name}`);
      console.log(`    artist_id:   ${row.artist_id}`);
      console.log(`    album_type:  ${row.album_type}`);
      console.log(`    release:     ${row.release_date}`);
      console.log(`    tracks:      ${row.total_tracks}`);
      console.log(`    genres:      ${JSON.stringify(row.genres)}`);
      console.log(`    upc:         ${row.upc}`);
      console.log(`    deezer_id:   ${row.deezer_id}`);
      console.log(`    image:       ${row.image_url}`);
      console.log(`    gaps:        ${gaps.length ? '⚠️  ' + gaps.join(', ') : '✅ none'}`);
      console.log('');
    } catch (e) {
      console.log(`❌ "${q}"  -> ERROR: ${(e as Error).message}\n`);
    }
  }
  console.log(`UPC coverage: ${upcCount}/${total} albums had a UPC (dedup key)\n`);
}

async function verifyUpcRoundTrip() {
  console.log('\n============= UPC ROUND-TRIP (dedup key) =============\n');
  // Take a known album, read its UPC, look it back up by UPC — must return the
  // same album. This is the backbone of the no-duplicates strategy.
  const search = await DeezerService.searchAlbums('Radiohead OK Computer', 1);
  const detail = await DeezerService.getAlbum(search.albums!.items[0].id);
  const upc = detail.external_ids?.upc;
  console.log(`album: ${detail.name}  id=${detail.id}  upc=${upc}`);
  if (!upc) {
    console.log('❌ no UPC to test round-trip');
    return;
  }
  const byUpc = await DeezerService.getAlbumByUpc(upc);
  console.log(`lookup by upc:${upc} -> ${byUpc ? byUpc.id + ' (' + byUpc.name + ')' : 'NULL'}`);
  console.log(byUpc?.id === detail.id ? '✅ round-trip matches\n' : '❌ MISMATCH\n');

  // And a bogus UPC must return null (not throw)
  const bogus = await DeezerService.getAlbumByUpc('000000000000');
  console.log(`lookup by bogus upc -> ${bogus === null ? '✅ null (as expected)' : '❌ unexpected result'}\n`);
}

async function verifyArtists() {
  console.log('\n=================== ARTIST DATA ===================\n');
  for (const q of ARTIST_QUERIES) {
    try {
      const search = await DeezerService.searchArtists(q, 1);
      const top = search.artists?.items?.[0];
      if (!top) {
        console.log(`❌ "${q}" -> NO RESULT\n`);
        continue;
      }
      const row = SpotifyMapper.mapArtistToDatabase(top as any);
      const gaps: string[] = [];
      if (!row.image_url || row.image_url.includes('placeholder'))
        gaps.push('NO_IMAGE');
      if (!row.follower_count) gaps.push('NO_FOLLOWERS');
      console.log(`▶ "${q}"`);
      console.log(`    id:            ${row.id}`);
      console.log(`    name:          ${row.name}`);
      console.log(`    image:         ${row.image_url}`);
      console.log(`    follower_count:${row.follower_count}`);
      console.log(`    deezer_id:     ${row.deezer_id}`);
      console.log(`    gaps:          ${gaps.length ? '⚠️  ' + gaps.join(', ') : '✅ none'}`);
      console.log('');
    } catch (e) {
      console.log(`❌ "${q}" -> ERROR: ${(e as Error).message}\n`);
    }
  }
}

(async () => {
  await verifyAlbums();
  await verifyUpcRoundTrip();
  await verifyArtists();
  console.log('done.');
})();
