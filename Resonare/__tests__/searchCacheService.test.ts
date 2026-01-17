/**
 * Search Cache Service Tests
 *
 * Tests for the in-memory LRU cache used for search results.
 */

import { searchCacheService } from '../src/services/searchCacheService';

describe('SearchCacheService', () => {
    beforeEach(() => {
        // Clear cache before each test
        searchCacheService.clearCache();
    });

    describe('get and set', () => {
        it('should return null for cache miss', () => {
            const result = searchCacheService.get('albums', 'nonexistent');
            expect(result).toBeNull();
        });

        it('should return cached results', () => {
            const mockResults = { albums: [{ id: '1', name: 'Test Album' }] };
            searchCacheService.set('albums', 'test query', mockResults);

            const result = searchCacheService.get('albums', 'test query');
            expect(result).toEqual(mockResults);
        });

        it('should treat cache keys as case-insensitive', () => {
            const mockResults = [{ id: '1', name: 'Artist' }];
            searchCacheService.set('artists', 'BEATLES', mockResults);

            const result = searchCacheService.get('artists', 'beatles');
            expect(result).toEqual(mockResults);
        });

        it('should treat cache keys as trim-normalized', () => {
            const mockResults = [{ id: '1', name: 'Artist' }];
            searchCacheService.set('artists', '  Beatles  ', mockResults);

            const result = searchCacheService.get('artists', 'beatles');
            expect(result).toEqual(mockResults);
        });

        it('should separate cache by search mode', () => {
            const albumResults = { albums: [{ id: '1' }] };
            const artistResults = [{ id: '2', name: 'Taylor Swift' }];

            searchCacheService.set('albums', 'taylor', albumResults);
            searchCacheService.set('artists', 'taylor', artistResults);

            expect(searchCacheService.get('albums', 'taylor')).toEqual(albumResults);
            expect(searchCacheService.get('artists', 'taylor')).toEqual(artistResults);
        });
    });

    describe('cache expiration', () => {
        it('should return null for expired cache entries', () => {
            const mockResults = { albums: [] };
            searchCacheService.set('albums', 'test', mockResults);

            // Mock time advancement past TTL (5 minutes + 1 second)
            const originalNow = Date.now;
            Date.now = jest.fn(() => originalNow() + 5 * 60 * 1000 + 1000);

            const result = searchCacheService.get('albums', 'test');
            expect(result).toBeNull();

            // Restore Date.now
            Date.now = originalNow;
        });
    });

    describe('LRU eviction', () => {
        it('should evict oldest entries when exceeding max size', () => {
            // Fill cache to max capacity (50 entries)
            for (let i = 0; i < 50; i++) {
                searchCacheService.set('albums', `query${i}`, { id: i });
            }

            expect(searchCacheService.getCacheStats().size).toBe(50);

            // Add one more - should evict the oldest (query0)
            searchCacheService.set('albums', 'query50', { id: 50 });

            expect(searchCacheService.getCacheStats().size).toBe(50);
            expect(searchCacheService.get('albums', 'query0')).toBeNull();
            expect(searchCacheService.get('albums', 'query50')).toEqual({ id: 50 });
        });

        it('should move accessed entries to end (LRU ordering)', () => {
            // Add 3 entries
            searchCacheService.set('albums', 'first', { id: 1 });
            searchCacheService.set('albums', 'second', { id: 2 });
            searchCacheService.set('albums', 'third', { id: 3 });

            // Access the first one (moves it to end)
            searchCacheService.get('albums', 'first');

            // Fill up to capacity
            for (let i = 4; i <= 50; i++) {
                searchCacheService.set('albums', `query${i}`, { id: i });
            }

            // Add one more - should evict 'second' (now the oldest)
            searchCacheService.set('albums', 'new', { id: 'new' });

            expect(searchCacheService.get('albums', 'second')).toBeNull();
            expect(searchCacheService.get('albums', 'first')).toEqual({ id: 1 }); // Still present
        });
    });

    describe('clearCache', () => {
        it('should clear all cached entries', () => {
            searchCacheService.set('albums', 'test1', { id: 1 });
            searchCacheService.set('artists', 'test2', { id: 2 });

            searchCacheService.clearCache();

            expect(searchCacheService.getCacheStats().size).toBe(0);
            expect(searchCacheService.get('albums', 'test1')).toBeNull();
        });
    });

    describe('getCacheStats', () => {
        it('should return correct cache statistics', () => {
            searchCacheService.set('albums', 'test1', { id: 1 });
            searchCacheService.set('albums', 'test2', { id: 2 });

            const stats = searchCacheService.getCacheStats();

            expect(stats.size).toBe(2);
            expect(stats.ttlMs).toBe(5 * 60 * 1000);
            expect(stats.maxSize).toBe(50);
        });
    });
});
