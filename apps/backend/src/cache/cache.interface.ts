/**
 * Cache storage interface - defines the contract for all cache implementations.
 * Supports cache-aside pattern with get, set, delete, and pattern-based deletion.
 */

export interface ICacheStorage {
	/**
	 * Get a value from cache by key.
	 * Returns null if not found or on error.
	 */
	get<T>(key: string): Promise<T | null>;

	/**
	 * Set a value in cache with optional TTL (time-to-live in seconds).
	 * Returns true if successful, false otherwise.
	 */
	set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;

	/**
	 * Delete a specific key from cache.
	 * Returns true if successful or key didn't exist, false on error.
	 */
	del(key: string): Promise<boolean>;

	/**
	 * Delete all keys matching a pattern (e.g., "petrel:file:*").
	 * Returns true if successful, false on error.
	 */
	delPattern(pattern: string): Promise<boolean>;

	/**
	 * Check if the cache storage is available/connected.
	 */
	isAvailable(): boolean;

	/**
	 * Get cache statistics for monitoring.
	 */
	getStats(): CacheStats;
}

/**
 * Cache statistics for monitoring and debugging.
 */
export interface CacheStats {
	hits: number;
	misses: number;
	size: number;
	isAvailable: boolean;
}

/**
 * Cache configuration options.
 */
export interface CacheConfig {
	/** Default TTL in seconds */
	defaultTTL: number;
	/** Maximum number of entries (for memory cache) */
	maxEntries?: number;
	/** Enable debug logging */
	debug?: boolean;
}

/**
 * Default cache TTL values (in seconds) for different data types.
 */
export const DEFAULT_TTL = {
	/** Metadata for files, folders, shares - rarely changes */
	metadata: 300, // 5 minutes
	/** Lists of files or folders - may change more frequently */
	list: 60, // 1 minute
	/** Streaming manifests - relatively stable */
	manifest: 60, // 1 minute
	/** User data - infrequently changes */
	user: 300, // 5 minutes
	/** Settings and configuration - rarely changes */
	settings: 600, // 10 minutes
} as const;
