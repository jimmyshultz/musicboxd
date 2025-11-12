# Artist Details Screen Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for adding an Artist Details screen to Resonare. This feature will allow users to view artist information and browse all albums by a specific artist.

## Implementation Goals
- Display artist details including name, image, and genres
- Show all albums by an artist in a browsable grid
- Enable navigation from album details to artist details and vice versa
- Integrate with Spotify API to fetch artist data
- Store artist data in Supabase database for caching and performance

## Technical Architecture
- **Database**: New `artists` table in Supabase
- **API**: Spotify Web API artist endpoints
- **Services**: New `artistService.ts` for data management
- **UI**: New `ArtistDetailsScreen.tsx` component
- **Navigation**: Add artist details route to all navigation stacks

---

## Phase 1: Database Schema & Migration

### Task 1.1: Create Artists Table
**File**: Create migration file in `/database/migrations/`

**Actions**:
- [ ] Create migration SQL file: `add_artists_table.sql`
- [ ] Define `artists` table schema:
  ```sql
  CREATE TABLE public.artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    spotify_url TEXT,
    genres TEXT[],
    follower_count INTEGER,
    popularity INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [ ] Add indexes for performance:
  ```sql
  CREATE INDEX idx_artists_name ON public.artists USING btree (name);
  CREATE INDEX idx_artists_popularity ON public.artists USING btree (popularity DESC);
  ```
- [ ] Enable RLS on artists table
- [ ] Create RLS policies (similar to albums - read-only for all authenticated users)

**Acceptance Criteria**:
- Migration file created and tested locally
- Table created with all columns and constraints
- Indexes added for search and sorting
- RLS enabled with appropriate policies

---

### Task 1.2: Update Albums Table Schema
**File**: Create migration file in `/database/migrations/`

**Actions**:
- [ ] Create migration SQL file: `add_artist_id_to_albums.sql`
- [ ] Add `artist_id` column to albums table:
  ```sql
  ALTER TABLE public.albums ADD COLUMN artist_id TEXT;
  ```
- [ ] Add foreign key constraint (optional - may need to be nullable for legacy data):
  ```sql
  ALTER TABLE public.albums 
  ADD CONSTRAINT albums_artist_id_fkey 
  FOREIGN KEY (artist_id) 
  REFERENCES public.artists(id) 
  ON DELETE SET NULL;
  ```
- [ ] Add index on `artist_id`:
  ```sql
  CREATE INDEX idx_albums_artist_id ON public.albums USING btree (artist_id);
  ```
- [ ] Keep `artist_name` column for backward compatibility and as fallback

**Acceptance Criteria**:
- `artist_id` column added to albums table
- Foreign key relationship established
- Index created for performance
- No breaking changes to existing queries

---

### Task 1.3: Update Triggers
**File**: Update migration file

**Actions**:
- [ ] Ensure `update_updated_at_column` trigger applies to artists table:
  ```sql
  CREATE TRIGGER update_artists_updated_at 
  BEFORE UPDATE ON public.artists 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
  ```

**Acceptance Criteria**:
- Trigger created and tested
- `updated_at` column automatically updates on record changes

---

### Task 1.4: Run Database Migrations
**Actions**:
- [ ] Test migrations locally in development database
- [ ] Review and backup production database
- [ ] Run migrations on production database
- [ ] Verify schema changes using Supabase dashboard
- [ ] Update `production_database_complete.sql` with new schema

**Acceptance Criteria**:
- All migrations run successfully without errors
- Schema verified in both dev and production
- Documentation updated

---

## Phase 2: TypeScript Types & Interfaces

### Task 2.1: Create Artist Types
**File**: `/src/types/index.ts`

**Actions**:
- [ ] Add `Artist` interface:
  ```typescript
  export interface Artist {
    id: string;
    name: string;
    imageUrl: string;
    genres: string[];
    spotifyUrl?: string;
    followerCount?: number;
    popularity?: number;
  }
  ```
- [ ] Add `ArtistWithAlbums` interface:
  ```typescript
  export interface ArtistWithAlbums extends Artist {
    albums: Album[];
    totalAlbums: number;
  }
  ```

**Acceptance Criteria**:
- Types compile without errors
- Types match database schema
- Properly exported for use throughout app

---

### Task 2.2: Create Spotify Artist Types
**File**: `/src/types/spotify.ts`

**Actions**:
- [ ] Extend existing `SpotifyArtist` interface if needed
- [ ] Add artist-specific response types:
  ```typescript
  export interface SpotifyArtistFull extends SpotifyArtist {
    followers: {
      href: string | null;
      total: number;
    };
    genres: string[];
    images: SpotifyImage[];
    popularity: number;
  }
  
  export interface SpotifyArtistAlbumsResponse {
    href: string;
    items: SpotifyAlbum[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
  }
  ```

**Acceptance Criteria**:
- Spotify types match API documentation
- Types properly extend existing interfaces
- No type conflicts

---

### Task 2.3: Update Navigation Types
**File**: `/src/types/index.ts`

**Actions**:
- [ ] Add `ArtistDetails` route to `HomeStackParamList`:
  ```typescript
  ArtistDetails: { artistId: string; artistName?: string };
  ```
- [ ] Add `ArtistDetails` route to `SearchStackParamList`
- [ ] Add `ArtistDetails` route to `ProfileStackParamList`

**Acceptance Criteria**:
- Navigation types updated for all stacks
- TypeScript compilation succeeds
- Navigation type checking works correctly

---

## Phase 3: Spotify Service Integration

### Task 3.1: Add Artist API Methods
**File**: `/src/services/spotifyService.ts`

**Actions**:
- [ ] Add `getArtist()` method:
  ```typescript
  static async getArtist(artistId: string): Promise<SpotifyArtistFull> {
    return this.makeRequest<SpotifyArtistFull>(
      `${SPOTIFY_CONFIG.ENDPOINTS.ARTISTS}/${artistId}`
    );
  }
  ```
- [ ] Add `getArtistAlbums()` method:
  ```typescript
  static async getArtistAlbums(
    artistId: string,
    params?: {
      include_groups?: string;
      market?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SpotifyArtistAlbumsResponse> {
    const requestParams: Record<string, string> = {
      include_groups: params?.include_groups || 'album,single',
      limit: (params?.limit || 50).toString(),
      offset: (params?.offset || 0).toString(),
    };
    
    if (params?.market) {
      requestParams.market = params.market;
    }
    
    return this.makeRequest<SpotifyArtistAlbumsResponse>(
      `${SPOTIFY_CONFIG.ENDPOINTS.ARTISTS}/${artistId}/albums`,
      requestParams
    );
  }
  ```
- [ ] Update ENDPOINTS config if needed:
  ```typescript
  ARTISTS: '/artists'
  ```

**Acceptance Criteria**:
- Methods properly typed with TypeScript
- Rate limiting respected
- Error handling consistent with existing methods
- Methods tested with real Spotify API

---

### Task 3.2: Add Artist Mapper Methods
**File**: `/src/services/spotifyMapper.ts`

**Actions**:
- [ ] Add `mapSpotifyArtistToArtist()` method:
  ```typescript
  static mapSpotifyArtistToArtist(spotifyArtist: SpotifyArtistFull): Artist {
    return {
      id: spotifyArtist.id,
      name: spotifyArtist.name,
      imageUrl: this.getBestImageUrl(spotifyArtist.images || []),
      genres: spotifyArtist.genres || [],
      spotifyUrl: spotifyArtist.external_urls?.spotify,
      followerCount: spotifyArtist.followers?.total,
      popularity: spotifyArtist.popularity,
    };
  }
  ```
- [ ] Add `mapArtistToDatabase()` method:
  ```typescript
  static mapArtistToDatabase(spotifyArtist: SpotifyArtistFull) {
    return {
      id: spotifyArtist.id,
      name: spotifyArtist.name,
      image_url: this.getBestImageUrl(spotifyArtist.images || []),
      spotify_url: spotifyArtist.external_urls?.spotify || null,
      genres: spotifyArtist.genres || [],
      follower_count: spotifyArtist.followers?.total || null,
      popularity: spotifyArtist.popularity || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  ```
- [ ] Update `mapAlbumToDatabase()` to include artist_id:
  ```typescript
  static mapAlbumToDatabase(spotifyAlbum: SpotifyAlbum) {
    return {
      // ... existing fields ...
      artist_id: spotifyAlbum.artists[0]?.id || null,
    };
  }
  ```

**Acceptance Criteria**:
- Mapper methods convert Spotify format to app format
- Database format matches schema exactly
- Methods handle missing/optional fields gracefully
- Consistent with existing mapper patterns

---

## Phase 4: Artist Service Layer

### Task 4.1: Create Artist Service
**File**: `/src/services/artistService.ts`

**Actions**:
- [ ] Create new file with base structure
- [ ] Import dependencies (Supabase, Spotify service, types)
- [ ] Add helper method `mapDatabaseArtistToApp()`:
  ```typescript
  private static mapDatabaseArtistToApp(dbArtist: any): Artist {
    return {
      id: dbArtist.id,
      name: dbArtist.name,
      imageUrl: dbArtist.image_url || '',
      genres: dbArtist.genres || [],
      spotifyUrl: dbArtist.spotify_url,
      followerCount: dbArtist.follower_count,
      popularity: dbArtist.popularity,
    };
  }
  ```

**Acceptance Criteria**:
- File created with proper imports
- Service class structure matches existing services
- Helper methods properly typed

---

### Task 4.2: Implement Get Artist By ID
**File**: `/src/services/artistService.ts`

**Actions**:
- [ ] Implement `getArtistById()` method:
  - First check local Supabase database
  - If not found, fetch from Spotify API
  - Store in database for future requests
  - Return artist data
- [ ] Handle errors appropriately
- [ ] Add caching strategy

**Example Implementation**:
```typescript
static async getArtistById(artistId: string): Promise<ApiResponse<Artist | null>> {
  try {
    // Check database first
    const { supabase } = await import('./supabase');
    const { data: dbArtist, error: dbError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single();
    
    if (dbArtist && !dbError) {
      return {
        data: this.mapDatabaseArtistToApp(dbArtist),
        success: true,
        message: 'Artist found in database',
      };
    }
    
    // Fetch from Spotify if not in database
    if (SpotifyService.isConfigured()) {
      const spotifyArtist = await SpotifyService.getArtist(artistId);
      const artist = SpotifyMapper.mapSpotifyArtistToArtist(spotifyArtist);
      
      // Store in database
      const dbFormat = SpotifyMapper.mapArtistToDatabase(spotifyArtist);
      await supabase.from('artists').upsert(dbFormat);
      
      return {
        data: artist,
        success: true,
        message: 'Artist found on Spotify',
      };
    }
    
    return {
      data: null,
      success: false,
      message: 'Artist not found',
    };
  } catch (error) {
    console.error('Error fetching artist:', error);
    return {
      data: null,
      success: false,
      message: 'Error fetching artist',
    };
  }
}
```

**Acceptance Criteria**:
- Method fetches from database first (performance)
- Falls back to Spotify API if not cached
- Stores fetched data in database
- Returns consistent ApiResponse format
- Handles all error cases

---

### Task 4.3: Implement Get Artist Albums
**File**: `/src/services/artistService.ts`

**Actions**:
- [ ] Implement `getArtistAlbums()` method:
  - Query database for albums by artist_id
  - If none found or incomplete, fetch from Spotify
  - Store new albums in database
  - Return sorted album list
- [ ] Add filtering options (album type, date range)
- [ ] Handle pagination if needed

**Example Implementation**:
```typescript
static async getArtistAlbums(
  artistId: string,
  options?: { includeGroups?: string; limit?: number }
): Promise<ApiResponse<Album[]>> {
  try {
    const { supabase } = await import('./supabase');
    
    // Query database for albums by this artist
    const { data: dbAlbums, error: dbError } = await supabase
      .from('albums')
      .select('*')
      .eq('artist_id', artistId)
      .order('release_date', { ascending: false });
    
    // If we have cached albums, return them
    if (dbAlbums && dbAlbums.length > 0 && !dbError) {
      const albums = dbAlbums.map(AlbumService.mapDatabaseAlbumToApp);
      return {
        data: albums,
        success: true,
        message: `Found ${albums.length} albums in database`,
      };
    }
    
    // Fetch from Spotify
    if (SpotifyService.isConfigured()) {
      const spotifyResponse = await SpotifyService.getArtistAlbums(artistId, {
        include_groups: options?.includeGroups || 'album,single',
        limit: options?.limit || 50,
      });
      
      const albums: Album[] = [];
      
      // Process and store each album
      for (const spotifyAlbum of spotifyResponse.items) {
        const album = SpotifyMapper.mapSpotifyAlbumToAlbum(spotifyAlbum);
        albums.push(album);
        
        // Store in database
        const dbFormat = SpotifyMapper.mapAlbumToDatabase(spotifyAlbum);
        await supabase.from('albums').upsert(dbFormat);
      }
      
      return {
        data: albums,
        success: true,
        message: `Found ${albums.length} albums on Spotify`,
      };
    }
    
    return {
      data: [],
      success: true,
      message: 'No albums found',
    };
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    return {
      data: [],
      success: false,
      message: 'Error fetching albums',
    };
  }
}
```

**Acceptance Criteria**:
- Method returns all albums by artist
- Albums sorted by release date (newest first)
- Handles both cached and fresh data
- Stores fetched albums in database
- Handles pagination for artists with many albums

---

### Task 4.4: Implement Get Artist By Name
**File**: `/src/services/artistService.ts`

**Actions**:
- [ ] Implement `getArtistByName()` method for fallback lookup
- [ ] Search Spotify for artist by name
- [ ] Return best match based on popularity
- [ ] Store found artist in database

**Note**: This is a helper method for when we only have artist name (legacy data)

**Acceptance Criteria**:
- Method searches Spotify by name
- Returns most popular/relevant match
- Handles no results gracefully
- Useful for legacy data migration

---

### Task 4.5: Update Album Service
**File**: `/src/services/albumService.ts`

**Actions**:
- [ ] Update `getAlbumById()` to also fetch and store artist data
- [ ] When saving album to database, ensure artist is saved first
- [ ] Update album queries to include artist_id

**Acceptance Criteria**:
- Albums automatically link to artists
- Artist data cached when album is fetched
- No breaking changes to existing functionality

---

## Phase 5: Redux State Management

### Task 5.1: Create Artist Slice
**File**: `/src/store/slices/artistSlice.ts`

**Actions**:
- [ ] Create new Redux slice for artist state
- [ ] Define initial state:
  ```typescript
  interface ArtistState {
    currentArtist: Artist | null;
    currentArtistAlbums: Album[];
    loading: boolean;
    error: string | null;
    albumsLoading: boolean;
  }
  ```
- [ ] Create actions:
  - `setCurrentArtist`
  - `clearCurrentArtist`
  - `setCurrentArtistAlbums`
  - `setLoading`
  - `setAlbumsLoading`
  - `setError`
- [ ] Export reducer and actions

**Acceptance Criteria**:
- Slice follows existing Redux patterns
- All actions properly typed
- State shape matches requirements
- Exports work correctly

---

### Task 5.2: Register Artist Slice
**File**: `/src/store/index.ts`

**Actions**:
- [ ] Import artistReducer
- [ ] Add to store configuration:
  ```typescript
  artist: artistReducer,
  ```
- [ ] Update RootState type if needed

**Acceptance Criteria**:
- Store compiles without errors
- State accessible via useSelector
- Actions dispatchable

---

## Phase 6: UI Components

### Task 6.1: Create Artist Details Screen
**File**: `/src/screens/Artist/ArtistDetailsScreen.tsx`

**Actions**:
- [ ] Create new directory `/src/screens/Artist/`
- [ ] Create `ArtistDetailsScreen.tsx` component
- [ ] Set up component structure with:
  - ScrollView container
  - RefreshControl for pull-to-refresh
  - Loading state UI
  - Error state UI
- [ ] Use React hooks (useState, useEffect, useCallback)
- [ ] Use Redux hooks (useSelector, useDispatch)
- [ ] Get artistId from route params

**Basic Structure**:
```typescript
export default function ArtistDetailsScreen() {
  const route = useRoute<ArtistDetailsRouteProp>();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const { artistId } = route.params;
  
  const { currentArtist, currentArtistAlbums, loading, albumsLoading } = 
    useSelector((state: RootState) => state.artist);
  
  const [refreshing, setRefreshing] = useState(false);
  
  // Load artist data
  const loadArtistData = useCallback(async () => {
    // Fetch artist and albums
  }, [artistId]);
  
  useEffect(() => {
    loadArtistData();
    return () => {
      dispatch(clearCurrentArtist());
    };
  }, [loadArtistData, dispatch]);
  
  // Render methods
  
  return (
    <ScrollView>
      {/* Content */}
    </ScrollView>
  );
}
```

**Acceptance Criteria**:
- Component created with proper structure
- Receives artistId from route params
- Connects to Redux state
- Has loading and error states
- TypeScript types correct

---

### Task 6.2: Implement Artist Header Section
**File**: `/src/screens/Artist/ArtistDetailsScreen.tsx`

**Actions**:
- [ ] Create header section with:
  - Artist image (circular or square with rounded corners)
  - Artist name (headline text)
  - Follower count (if available)
  - Popularity indicator (if available)
  - Genre chips
- [ ] Style according to app theme
- [ ] Make responsive

**Example JSX**:
```typescript
<View style={styles.header}>
  <Image 
    source={{ uri: currentArtist.imageUrl }} 
    style={styles.artistImage} 
  />
  <Text variant="headlineLarge" style={styles.artistName}>
    {currentArtist.name}
  </Text>
  {currentArtist.followerCount && (
    <Text variant="bodyMedium" style={styles.followers}>
      {formatFollowers(currentArtist.followerCount)} followers
    </Text>
  )}
  <View style={styles.genresContainer}>
    {currentArtist.genres.slice(0, 3).map((genre, index) => (
      <Chip key={index} style={styles.genreChip} compact>
        {genre}
      </Chip>
    ))}
  </View>
</View>
```

**Acceptance Criteria**:
- Header displays all artist information
- Image loads and displays correctly
- Text is readable and styled consistently
- Genres displayed as chips
- Responsive layout

---

### Task 6.3: Implement Albums Grid
**File**: `/src/screens/Artist/ArtistDetailsScreen.tsx`

**Actions**:
- [ ] Create albums grid section
- [ ] Use FlatList with numColumns for grid layout
- [ ] Create AlbumCard component or reuse existing
- [ ] Make album cards tappable to navigate to AlbumDetails
- [ ] Add section header "Albums"
- [ ] Handle empty state
- [ ] Add loading state for albums

**Example Implementation**:
```typescript
const renderAlbumItem = ({ item }: { item: Album }) => (
  <TouchableOpacity
    style={styles.albumCard}
    onPress={() => navigation.navigate('AlbumDetails', { albumId: item.id })}
  >
    <Image source={{ uri: item.coverImageUrl }} style={styles.albumCover} />
    <Text variant="bodyMedium" style={styles.albumTitle} numberOfLines={2}>
      {item.title}
    </Text>
    <Text variant="bodySmall" style={styles.albumYear}>
      {getAlbumYear(item.releaseDate)}
    </Text>
  </TouchableOpacity>
);

<View style={styles.albumsSection}>
  <Text variant="titleLarge" style={styles.sectionTitle}>
    Albums
  </Text>
  <FlatList
    data={currentArtistAlbums}
    renderItem={renderAlbumItem}
    keyExtractor={(item) => item.id}
    numColumns={2}
    columnWrapperStyle={styles.albumsRow}
    contentContainerStyle={styles.albumsGrid}
    scrollEnabled={false}
  />
</View>
```

**Acceptance Criteria**:
- Albums displayed in responsive grid (2-3 columns)
- Each album shows cover, title, and year
- Tapping album navigates to AlbumDetails
- Loading state shown while fetching
- Empty state shown if no albums
- Maintains scroll performance

---

### Task 6.4: Add Loading and Error States
**File**: `/src/screens/Artist/ArtistDetailsScreen.tsx`

**Actions**:
- [ ] Implement loading state (ActivityIndicator centered)
- [ ] Implement error state with retry button
- [ ] Implement empty state for no albums
- [ ] Add pull-to-refresh functionality

**Acceptance Criteria**:
- Loading spinner shown while fetching data
- Error message displayed on failure with retry option
- Empty state shows helpful message
- Pull-to-refresh works correctly

---

### Task 6.5: Style Artist Details Screen
**File**: `/src/screens/Artist/ArtistDetailsScreen.tsx`

**Actions**:
- [ ] Create comprehensive StyleSheet
- [ ] Use theme colors and spacing
- [ ] Match existing app design patterns
- [ ] Ensure dark mode support
- [ ] Make layout responsive

**Style Considerations**:
- Header padding and margins
- Artist image size (200-250px)
- Genre chip styling
- Album grid gaps and sizing
- Text hierarchy
- Dark mode colors

**Acceptance Criteria**:
- Styles consistent with app design
- Dark mode fully supported
- Responsive on different screen sizes
- No layout overflow or clipping issues

---

## Phase 7: Navigation Integration

### Task 7.1: Add Artist Route to Navigation Stacks
**File**: `/src/navigation/AppNavigator.tsx`

**Actions**:
- [ ] Import ArtistDetailsScreen component
- [ ] Add route to HomeStack:
  ```typescript
  <HomeStack.Screen
    name="ArtistDetails"
    component={ArtistDetailsScreen}
    options={({ navigation }) => ({
      title: 'Artist',
      headerBackVisible: false,
      headerLeft: () => <BackButton navigation={navigation} />,
    })}
  />
  ```
- [ ] Add route to SearchStack (same configuration)
- [ ] Add route to ProfileStack (same configuration)

**Acceptance Criteria**:
- Route added to all three stacks
- Navigation compiles without errors
- Back button works correctly
- Header styling matches other screens

---

### Task 7.2: Make Artist Name Clickable in Album Details
**File**: `/src/screens/Album/AlbumDetailsScreen.tsx`

**Actions**:
- [ ] Import necessary navigation hooks
- [ ] Wrap artist name in TouchableOpacity (around line 302)
- [ ] Add onPress handler to navigate to artist
- [ ] Extract artist ID from album data
- [ ] Handle case where artist ID is not available

**Implementation**:
```typescript
const handleArtistPress = () => {
  // Need to get artist ID - this is the challenge!
  // Option 1: If we have it in album data
  if (currentAlbum.artistId) {
    navigation.navigate('ArtistDetails', { 
      artistId: currentAlbum.artistId 
    });
  } else {
    // Option 2: Search for artist by name as fallback
    // This would require additional service method
    console.warn('Artist ID not available');
  }
};

// In render:
<TouchableOpacity onPress={handleArtistPress}>
  <Text variant="titleLarge" style={styles.artistName}>
    {currentAlbum.artist}
  </Text>
</TouchableOpacity>
```

**Challenge**: Current album data only has `artist` name, not ID. Options:
1. Update Album type to include `artistId?: string`
2. Fetch artist ID on demand when tapped
3. Store artist ID when album is fetched from Spotify

**Acceptance Criteria**:
- Artist name is tappable
- Navigates to correct artist details screen
- Visual feedback on press (underline, color change, etc.)
- Handles missing artist ID gracefully

---

### Task 7.3: Add Artist Search to Search Screen
**File**: `/src/screens/Search/SearchScreen.tsx`

**Actions**:
- [ ] Update search mode toggle to show "Artists" option
- [ ] Implement artist search functionality
- [ ] Display artist results in list/grid
- [ ] Make artist results tappable to navigate to ArtistDetails
- [ ] Update UI to show artist images and names

**Note**: Search screen already has infrastructure for this (line 91 has searchMode state)

**Acceptance Criteria**:
- Can toggle between Album and Artist search
- Artist search queries Spotify
- Results display artist images and names
- Tapping result navigates to ArtistDetails

---

## Phase 8: Data Migration & Updates

### Task 8.1: Update Album Type Definition
**File**: `/src/types/index.ts`

**Actions**:
- [ ] Add optional `artistId` field to Album interface:
  ```typescript
  export interface Album {
    id: string;
    title: string;
    artist: string;
    artistId?: string; // NEW FIELD
    // ... rest of fields
  }
  ```

**Acceptance Criteria**:
- Album type includes artistId
- Field is optional for backward compatibility
- No breaking changes to existing code

---

### Task 8.2: Update Album Fetching to Include Artist ID
**File**: `/src/services/albumService.ts`

**Actions**:
- [ ] Update `getAlbumById()` to extract and store artist ID
- [ ] When fetching from Spotify, save artist data to artists table
- [ ] Update `mapDatabaseAlbumToApp()` to include artistId
- [ ] Ensure album saves include artist_id

**Acceptance Criteria**:
- New album fetches include artist ID
- Artist data saved to database
- Album-artist relationship maintained
- No errors on albums without artist ID

---

### Task 8.3: Create Data Migration Script (Optional)
**File**: `/src/scripts/migrate-artist-data.ts`

**Actions**:
- [ ] Create script to backfill artist data for existing albums
- [ ] Query all albums without artist_id
- [ ] For each album, search Spotify for artist by name
- [ ] Save artist data and update album with artist_id
- [ ] Log progress and errors

**Note**: This is optional but recommended for production data

**Acceptance Criteria**:
- Script runs without crashing
- Respects Spotify rate limits
- Logs progress clearly
- Handles errors gracefully
- Can be run multiple times safely (idempotent)

---

## Phase 9: Testing & Quality Assurance

### Task 9.1: Unit Tests
**Actions**:
- [ ] Test artistService methods
  - getArtistById with valid ID
  - getArtistById with invalid ID
  - getArtistAlbums with various artists
- [ ] Test spotifyMapper artist methods
- [ ] Test Redux artist slice reducers
- [ ] Test navigation type safety

**Acceptance Criteria**:
- All service methods have unit tests
- Tests cover success and error cases
- Tests use mocked Spotify responses
- All tests pass

---

### Task 9.2: Integration Tests
**Actions**:
- [ ] Test complete flow: search → artist → albums → album details
- [ ] Test navigation between screens
- [ ] Test data fetching and caching
- [ ] Test offline behavior
- [ ] Test error recovery

**Acceptance Criteria**:
- Integration tests cover major user flows
- Tests verify database interactions
- Tests check UI state updates
- All tests pass

---

### Task 9.3: Manual Testing Checklist
**Actions**:
- [ ] Test on iOS device/simulator
- [ ] Test on Android device/emulator
- [ ] Test with various artists (popular, indie, new)
- [ ] Test with artists with many albums (50+)
- [ ] Test with artists with few albums
- [ ] Test navigation from multiple entry points
- [ ] Test pull-to-refresh
- [ ] Test error states (network off)
- [ ] Test loading states
- [ ] Test dark mode
- [ ] Test different screen sizes
- [ ] Test performance with large album lists

**Acceptance Criteria**:
- All manual test cases pass
- No crashes or UI glitches
- Performance acceptable
- Consistent behavior across platforms

---

### Task 9.4: Performance Testing
**Actions**:
- [ ] Test with slow network connection
- [ ] Test with 100+ albums for an artist
- [ ] Profile component render times
- [ ] Check for memory leaks
- [ ] Verify image loading performance
- [ ] Test scroll performance

**Acceptance Criteria**:
- App remains responsive under load
- No memory leaks detected
- Images load progressively
- Smooth scrolling maintained

---

## Phase 10: Documentation & Deployment

### Task 10.1: Update API Documentation
**File**: `/src/services/README.md` or similar

**Actions**:
- [ ] Document artistService API
- [ ] Document new Spotify endpoints used
- [ ] Add code examples
- [ ] Update service architecture diagram

**Acceptance Criteria**:
- Service methods documented
- Examples provided
- Architecture updated

---

### Task 10.2: Update User Documentation
**Actions**:
- [ ] Add feature description to README
- [ ] Create user guide for artist browsing
- [ ] Update feature list
- [ ] Add screenshots

**Acceptance Criteria**:
- User-facing documentation updated
- Screenshots show new feature
- Instructions clear and accurate

---

### Task 10.3: Production Deployment
**Actions**:
- [ ] Review all code changes
- [ ] Run all tests in CI/CD
- [ ] Create pull request with comprehensive description
- [ ] Get code review
- [ ] Merge to main branch
- [ ] Run database migrations in production
- [ ] Deploy app update
- [ ] Monitor for errors
- [ ] Verify feature works in production

**Acceptance Criteria**:
- All tests pass in CI
- Code reviewed and approved
- Database migrations successful
- Feature works in production
- No new errors in logs

---

### Task 10.4: Post-Launch Monitoring
**Actions**:
- [ ] Monitor crash analytics for artist screen
- [ ] Check Spotify API usage and rate limits
- [ ] Monitor database query performance
- [ ] Gather user feedback
- [ ] Track feature usage analytics

**Acceptance Criteria**:
- No increase in crash rate
- API usage within limits
- Database performance acceptable
- User feedback collected

---

## Dependencies & Blockers

### Critical Dependencies
1. **Spotify API Access**: Ensure API credentials are valid and rate limits understood
2. **Database Access**: Need production database access to run migrations
3. **Artist ID Data**: Albums must include artist IDs for proper linking

### Potential Blockers
1. **Legacy Data**: Existing albums only have artist names, not IDs
   - **Solution**: Implement fallback search by name
2. **Multiple Artists**: How to handle albums with multiple artists?
   - **Solution**: Link to primary artist only for MVP
3. **Spotify Rate Limits**: Could slow down data migration
   - **Solution**: Implement backoff and batch processing
4. **Performance**: Large album catalogs could cause UI slowdown
   - **Solution**: Implement pagination and virtualized lists

---

## Rollback Plan

If critical issues arise post-deployment:

1. **Code Rollback**:
   - Revert to previous app version
   - Database schema changes are backward compatible (nullable fields)

2. **Database Rollback**:
   - `artist_id` column is nullable - can be removed if needed
   - `artists` table can be dropped without affecting albums table

3. **Feature Flag** (Recommended):
   - Wrap artist details feature in feature flag
   - Can disable without full rollback if needed

---

## Success Metrics

### Technical Metrics
- [ ] Zero crashes related to artist screen
- [ ] Artist page load time < 2 seconds
- [ ] 90%+ of albums have artist_id linked
- [ ] Database queries < 100ms average

### User Metrics
- [ ] Artist details screen viewed by 50%+ of active users
- [ ] Average 3+ artist pages viewed per session
- [ ] Low bounce rate from artist screen

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Database Schema | 4-6 hours | None |
| 2. TypeScript Types | 2-3 hours | Phase 1 |
| 3. Spotify Integration | 4-6 hours | Phase 2 |
| 4. Service Layer | 6-8 hours | Phase 3 |
| 5. Redux State | 2-3 hours | Phase 2, 4 |
| 6. UI Components | 8-12 hours | Phase 5 |
| 7. Navigation | 3-4 hours | Phase 6 |
| 8. Data Migration | 2-4 hours | Phase 4 |
| 9. Testing | 6-8 hours | Phase 7 |
| 10. Documentation & Deploy | 3-4 hours | Phase 9 |

**Total Estimated Time: 40-58 hours**

**Recommended Sprint Breakdown**:
- **Sprint 1** (2 weeks): Phases 1-4 (Backend foundation)
- **Sprint 2** (2 weeks): Phases 5-7 (Frontend implementation)
- **Sprint 3** (1 week): Phases 8-10 (Testing and deployment)

---

## Notes & Considerations

1. **MVP Scope**: Initial implementation should focus on core functionality:
   - Display artist info
   - Show artist's albums
   - Navigate between artist and album screens

2. **Future Enhancements**:
   - Artist following/favoriting
   - Similar artists
   - Artist statistics (most popular albums)
   - Related artists
   - Artist bio/description from external sources

3. **Design Consistency**: Ensure artist screen matches existing design language
   - Use same color schemes
   - Match typography
   - Consistent spacing
   - Similar loading states

4. **Accessibility**:
   - Add proper labels for screen readers
   - Ensure sufficient color contrast
   - Make touch targets large enough
   - Support dynamic text sizing

---

## Questions to Resolve

- [ ] How to handle compilation albums (multiple artists)?
- [ ] Should we show singles separately from albums?
- [ ] Do we need artist search in dedicated artist search screen?
- [ ] Should we add artist filtering options (by album type, year)?
- [ ] Do we want to show featured artist roles differently?

---

*Document Version: 1.0*  
*Created: November 12, 2025*  
*Last Updated: November 12, 2025*

