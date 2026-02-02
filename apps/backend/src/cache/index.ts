/**
 * Cache layer exports for Petrel backend.
 *
 * Provides a unified caching interface with Redis primary and memory fallback.
 *
 * Quick Start:
 *   import { cacheManager, Cacheable, CacheEvict, cacheKeys, cacheTTL } from './cache';
 *
 *   // Direct usage
 *   const value = await cacheManager.get('key');
 *   await cacheManager.set('key', value, 300);
 *
 *   // Decorator usage
 *   class MyService {
 *     @Cacheable({ key: (id) => cacheKeys.file(id), ttl: cacheTTL.file })
 *     async getFile(id: number) { ... }
 *
 *     @CacheEvict({ key: (id) => cacheKeys.file(id) })
 *     async updateFile(id: number) { ... }
 *   }
 */

export type { CacheConfig, CacheStats, ICacheStorage } from "./cache.interface";
export { cacheManager } from "./cache.manager";
export { CacheEvict, type CacheEvictOptions } from "./decorators/cache-evict";
export { Cacheable, type CacheableOptions } from "./decorators/cacheable";
export { cacheKeys, cacheTTL } from "./keys";
export { MemoryCacheStorage } from "./storage/memory.cache";
export { RedisCacheStorage } from "./storage/redis.cache";
