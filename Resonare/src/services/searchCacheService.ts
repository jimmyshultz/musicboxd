/**
 * Search Cache Service
 *
 * Provides in-memory LRU caching for search results to reduce
 * Spotify API calls and provide instant results for repeat searches.
 *
 * Performance Issue #11 - Search Results Not Cached
 */

export type SearchMode = 'albums' | 'artists' | 'users';

interface CacheEntry {
    results: unknown;
    timestamp: number;
}

class SearchCacheService {
    private cache = new Map<string, CacheEntry>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_CACHE_SIZE = 50; // LRU limit

    /**
     * Generate a normalized cache key from search mode and query
     */
    private getCacheKey(searchMode: SearchMode, query: string): string {
        return `${searchMode}:${query.toLowerCase().trim()}`;
    }

    /**
     * Get cached results if they exist and haven't expired
     * @returns Cached results or null if not found/expired
     */
    get<T>(searchMode: SearchMode, query: string): T | null {
        const key = this.getCacheKey(searchMode, query);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
            this.cache.delete(key);
            return null;
        }

        // Move to end for LRU ordering (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.results as T;
    }

    /**
     * Store results in cache with LRU eviction
     */
    set(searchMode: SearchMode, query: string, results: unknown): void {
        const key = this.getCacheKey(searchMode, query);

        // Remove existing entry if present (for LRU reordering)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Evict oldest entry if at capacity
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            results,
            timestamp: Date.now(),
        });
    }

    /**
     * Clear all cached results
     * Useful for testing or when cache needs to be invalidated
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics for monitoring/debugging
     */
    getCacheStats(): { size: number; ttlMs: number; maxSize: number } {
        return {
            size: this.cache.size,
            ttlMs: this.CACHE_TTL_MS,
            maxSize: this.MAX_CACHE_SIZE,
        };
    }
}

export const searchCacheService = new SearchCacheService();
