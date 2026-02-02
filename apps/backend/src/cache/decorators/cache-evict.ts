import { logger } from "../../lib/logger";
import { cacheManager } from "../cache.manager";

/**
 * CacheEvict decorator options.
 */
export interface CacheEvictOptions {
	/** Cache key or function to generate key from arguments */
	key: string | ((...args: never[]) => string);
	/** If true, evict all keys matching the pattern (allows wildcards) */
	allEntries?: boolean;
	/** If true, evict before method execution (default: after) */
	beforeInvocation?: boolean;
}

/**
 * @CacheEvict decorator - invalidates cache entries after (or before) method execution.
 *
 * Usage:
 *   @CacheEvict({ key: (id) => cacheKeys.file(id) })
 *   async updateFile(id: number, data: UpdateInput): Promise<File> {
 *     // ... update in database
 *   }
 *
 *   @CacheEvict({ key: 'petrel:files:list:*', allEntries: true })
 *   async createFile(data: CreateInput): Promise<File> {
 *     // ... create in database
 *   }
 *
 *   @CacheEvict({ key: (id) => cacheKeys.file(id), beforeInvocation: true })
 *   async deleteFile(id: number): Promise<void> {
 *     // ... delete from database
 *   }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CacheEvict(
	options: CacheEvictOptions,
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
			throw new Error("@CacheEvict can only be applied to methods");
		}

		async function evictCache(args: unknown[]): Promise<void> {
			const cacheKey =
				typeof options.key === "function" ? options.key(...(args as never[])) : options.key;

			try {
				if (options.allEntries) {
					await cacheManager.delPattern(cacheKey);
					logger.debug({ pattern: cacheKey, method: propertyKey }, "Cache pattern evicted");
				} else {
					await cacheManager.del(cacheKey);
					logger.debug({ key: cacheKey, method: propertyKey }, "Cache entry evicted");
				}
			} catch (err) {
				logger.debug({ err, key: cacheKey }, "Cache eviction failed");
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		descriptor.value = async function (this: any, ...args: unknown[]): Promise<unknown> {
			if (options.beforeInvocation) {
				await evictCache(args);
			}

			const result = await originalMethod.apply(this, args);

			if (!options.beforeInvocation) {
				await evictCache(args);
			}

			return result;
		};

		return descriptor;
	};
}
