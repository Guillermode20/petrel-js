import { logger } from "../lib/logger";
import { getRedis, isRedisConnected } from "../lib/redis";
import type { ICacheStorage } from "./cache.interface";
import { MemoryCacheStorage } from "./storage/memory.cache";
import { RedisCacheStorage } from "./storage/redis.cache";

/**
 * Cache manager that orchestrates between Redis and in-memory cache.
 * Automatically falls back to memory cache when Redis is unavailable.
 *
 * Usage:
 *   import { cacheManager } from './cache/manager';
 *   const value = await cacheManager.get('key');
 *   await cacheManager.set('key', value, 300);
 */
class CacheManager {
	private primary: ICacheStorage | null = null;
	private fallback: MemoryCacheStorage;
	private isInitialized = false;

	constructor() {
		this.fallback = new MemoryCacheStorage();
	}

	/**
	 * Initialize the cache manager with Redis if available.
	 * Should be called once at application startup.
	 */
	initialize(): void {
		if (this.isInitialized) {
			return;
		}

		const redis = getRedis();
		if (redis && isRedisConnected()) {
			this.primary = new RedisCacheStorage(redis);
			logger.info("Cache manager initialized with Redis");
		} else {
			logger.info("Cache manager initialized with in-memory fallback");
		}

		this.isInitialized = true;
	}

	/**
	 * Get the active cache storage (primary or fallback).
	 */
	private getStorage(): ICacheStorage {
		if (!this.isInitialized) {
			this.initialize();
		}

		// Check if primary (Redis) is still available
		if (this.primary?.isAvailable()) {
			return this.primary;
		}

		return this.fallback;
	}

	/**
	 * Get a value from cache.
	 */
	async get<T>(key: string): Promise<T | null> {
		return this.getStorage().get<T>(key);
	}

	/**
	 * Set a value in cache with optional TTL.
	 */
	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
		return this.getStorage().set(key, value, ttlSeconds);
	}

	/**
	 * Delete a specific key from cache.
	 */
	async del(key: string): Promise<boolean> {
		// Try to delete from both storages
		const results = await Promise.all([this.primary?.del(key), this.fallback.del(key)]);
		return results.some((r) => r === true);
	}

	/**
	 * Delete all keys matching a pattern.
	 */
	async delPattern(pattern: string): Promise<boolean> {
		// Try to delete from both storages
		const results = await Promise.all([
			this.primary?.delPattern(pattern),
			this.fallback.delPattern(pattern),
		]);
		return results.some((r) => r === true);
	}

	/**
	 * Get cache statistics from all storages.
	 */
	getStats(): {
		primary: ReturnType<ICacheStorage["getStats"]> | null;
		fallback: ReturnType<ICacheStorage["getStats"]>;
	} {
		return {
			primary: this.primary?.getStats() ?? null,
			fallback: this.fallback.getStats(),
		};
	}

	/**
	 * Check if Redis is being used as primary storage.
	 */
	isUsingRedis(): boolean {
		return this.primary?.isAvailable() ?? false;
	}
}

export const cacheManager = new CacheManager();
