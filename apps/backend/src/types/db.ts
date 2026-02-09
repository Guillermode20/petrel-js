/**
 * Database transaction type for service methods
 * This is a simplified type that accepts both transaction and database objects
 * Use this instead of `any` for transaction parameters
 *
 * TODO: Replace with proper Drizzle transaction type when TypeScript inference works better
 * The proper type is: Parameters<Parameters<BunSQLiteDatabase["transaction"]>[0]>[0]
 * but this causes complex circular type issues with Drizzle's schema inference.
 */
// biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction type is complex - see TODO above
export type DatabaseTransaction = any;

/**
 * Base entity interface for type guards
 */
export interface EntityWithId {
	id: number;
}

/**
 * Type predicate to check if value is non-null object
 */
export function isNonNullObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
