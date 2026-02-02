import { logger } from "../../lib/logger";
import { cacheManager } from "../cache.manager";

/**
 * Cacheable decorator options.
 */
export interface CacheableOptions {
	/** Cache key or function to generate key from arguments */
	key: string | ((...args: never[]) => string);
	/** TTL in seconds (defaults to 300 / 5 minutes) */
	ttl?: number;
	/** Condition to check before caching (return false to skip cache) */
	condition?: (...args: never[]) => boolean;
}

/**
 * @Cacheable decorator - caches the result of a method.
 *
 * Usage:
 *   @Cacheable({ key: (id) => cacheKeys.file(id), ttl: cacheTTL.file })
 *   async getById(id: number): Promise<File | null> {
 *     // ... fetch from database
 *   }
 *
 *   @Cacheable({ key: 'my-static-key', ttl: 60 })
 *   async expensiveOperation(): Promise<Result> {
 *     // ... heavy computation
 *   }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Cacheable(
	options: CacheableOptions,
): (
	target: any,
	propertyKey: string | symbol,
	descriptor: PropertyDescriptor,
) => PropertyDescriptor {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (
		_target: any,
		propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	): PropertyDescriptor => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const originalMethod = descriptor.value as (...args: any[]) => Promise<unknown>;

		if (typeof originalMethod !== "function") {
			throw new Error("@Cacheable can only be applied to methods");
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		descriptor.value = async function (this: any, ...args: unknown[]): Promise<unknown> {
			// Check condition if provided
			if (options.condition && !options.condition(...(args as never[]))) {
				return originalMethod.apply(this, args);
			}

			// Generate cache key
			const cacheKey =
				typeof options.key === "function" ? options.key(...(args as never[])) : options.key;

			try {
				// Try to get from cache
				const cached = await cacheManager.get<unknown>(cacheKey);
				if (cached !== null) {
					logger.debug({ key: cacheKey, method: propertyKey }, "Cache hit");
					return cached;
				}
			} catch (err) {
				logger.debug({ err, key: cacheKey }, "Cache get error, proceeding without cache");
			}

			// Execute original method
			const result = await originalMethod.apply(this, args);

			// Store in cache (fire and forget - don't block response)
			if (result !== null && result !== undefined) {
				cacheManager.set(cacheKey, result, options.ttl).catch((err: Error) => {
					logger.debug({ err, key: cacheKey }, "Cache set failed");
				});
			}

			return result;
		};

		return descriptor;
	};
}
