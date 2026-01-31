import Redis from "ioredis";
import { config } from "../config";
import { logger } from "./logger";

/**
 * Redis client for caching layer.
 * Provides connection management and graceful fallback when Redis is unavailable.
 */

let redisClient: Redis | null = null;
let isConnected = false;

/**
 * Initialize Redis connection if REDIS_URL is configured
 */
export function initRedis(): Redis | null {
	if (!config.REDIS_URL) {
		logger.info("Redis URL not configured, caching disabled");
		return null;
	}

	try {
		redisClient = new Redis(config.REDIS_URL, {
			maxRetriesPerRequest: 3,
			retryStrategy: (times) => {
				if (times > 3) {
					logger.warn("Redis connection failed after 3 retries, disabling cache");
					return null;
				}
				return Math.min(times * 200, 2000);
			},
			lazyConnect: true,
		});

		redisClient.on("connect", () => {
			isConnected = true;
			logger.info("Redis connected successfully");
		});

		redisClient.on("error", (err) => {
			logger.error({ err }, "Redis connection error");
			isConnected = false;
		});

		redisClient.on("close", () => {
			isConnected = false;
			logger.warn("Redis connection closed");
		});

		// Attempt initial connection
		redisClient.connect().catch((err) => {
			logger.warn({ err }, "Redis initial connection failed, continuing without cache");
		});

		return redisClient;
	} catch (err) {
		logger.error({ err }, "Failed to initialize Redis client");
		return null;
	}
}

/**
 * Get the Redis client instance
 */
export function getRedis(): Redis | null {
	return redisClient;
}

/**
 * Check if Redis is currently connected
 */
export function isRedisConnected(): boolean {
	return isConnected && redisClient !== null;
}

/**
 * Cache helper functions with automatic fallback
 */
export const cache = {
	/**
	 * Get a value from cache
	 */
	async get<T>(key: string): Promise<T | null> {
		if (!isRedisConnected() || !redisClient) {
			return null;
		}

		try {
			const value = await redisClient.get(key);
			return value ? (JSON.parse(value) as T) : null;
		} catch (err) {
			logger.debug({ err, key }, "Cache get failed");
			return null;
		}
	},

	/**
	 * Set a value in cache with TTL (in seconds)
	 */
	async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<boolean> {
		if (!isRedisConnected() || !redisClient) {
			return false;
		}

		try {
			await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
			return true;
		} catch (err) {
			logger.debug({ err, key }, "Cache set failed");
			return false;
		}
	},

	/**
	 * Delete a value from cache
	 */
	async del(key: string): Promise<boolean> {
		if (!isRedisConnected() || !redisClient) {
			return false;
		}

		try {
			await redisClient.del(key);
			return true;
		} catch (err) {
			logger.debug({ err, key }, "Cache delete failed");
			return false;
		}
	},

	/**
	 * Delete all keys matching a pattern
	 */
	async delPattern(pattern: string): Promise<boolean> {
		if (!isRedisConnected() || !redisClient) {
			return false;
		}

		try {
			const keys = await redisClient.keys(pattern);
			if (keys.length > 0) {
				await redisClient.del(...keys);
			}
			return true;
		} catch (err) {
			logger.debug({ err, pattern }, "Cache delete pattern failed");
			return false;
		}
	},
};

/**
 * Cache key generators for consistent key naming
 */
export const cacheKeys = {
	fileMetadata: (fileId: number): string => `file:metadata:${fileId}`,
	fileList: (folderId: string, page: number): string => `files:list:${folderId}:${page}`,
	streamManifest: (fileId: number): string => `stream:manifest:${fileId}`,
	share: (token: string): string => `share:${token}`,
	user: (userId: number): string => `user:${userId}`,
};

/**
 * Cache TTL values (in seconds)
 */
export const cacheTTL = {
	fileMetadata: 300, // 5 minutes
	fileList: 60, // 1 minute
	streamManifest: 60, // 1 minute
	share: 120, // 2 minutes
	user: 300, // 5 minutes
};

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
	if (redisClient) {
		await redisClient.quit();
		redisClient = null;
		isConnected = false;
		logger.info("Redis connection closed");
	}
}
