import NodeCache from 'node-cache';

/**
 * Singleton class for managing application-level caching.
 * Used for expensive queries like monthly reports, health scores, and analytics.
 */
class CacheService {
    private cache: NodeCache;

    constructor() {
        // Default TTL of 600 seconds (10 minutes)
        // checkperiod determines how often the cache is scanned for expired entries
        this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
    }

    /**
     * Get a value from the cache
     */
    get<T>(key: string): T | undefined {
        return this.cache.get<T>(key);
    }

    /**
     * Set a value in the cache
     * @param key Unique key
     * @param value Data to store
     * @param ttl Custom TTL in seconds
     */
    set<T>(key: string, value: T, ttl?: number): boolean {
        if (ttl) {
            return this.cache.set(key, value, ttl);
        }
        return this.cache.set(key, value);
    }

    /**
     * Delete a specific key
     */
    del(key: string): number {
        return this.cache.del(key);
    }

    /**
     * Clear all keys for a specific profile (prefix match)
     */
    clearProfileCache(profileId: string): void {
        const keys = this.cache.keys();
        const profileKeys = keys.filter(k => k.startsWith(`profile:${profileId}:`));
        this.cache.del(profileKeys);
    }

    /**
     * Flush entire cache
     */
    flush(): void {
        this.cache.flushAll();
    }
}

export const cacheService = new CacheService();
