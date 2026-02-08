import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import path from "node:path";
import * as schema from "../../db/schema";

/**
 * Test database utilities for integration testing.
 * Uses in-memory SQLite for fast, isolated tests.
 *
 * Schema is applied via Drizzle migrations (the same ones used in production),
 * so test and production schemas can never drift out of sync.
 */

export interface TestDb {
	db: ReturnType<typeof drizzle>;
	sqlite: Database;
	close: () => void;
}

const MIGRATIONS_FOLDER = path.resolve(import.meta.dir, "..", "..", "drizzle");

/**
 * Create an in-memory test database with the full schema
 * applied via Drizzle migrations (same as production).
 */
export function createTestDatabase(): TestDb {
	const sqlite = new Database(":memory:");
	const db = drizzle(sqlite, { schema });

	migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

	return {
		db,
		sqlite,
		close: () => sqlite.close(),
	};
}

/**
 * Create a test user and return the user data
 */
export function createTestUser(
	testDb: TestDb,
	userData: { username: string; passwordHash: string; role?: string },
): typeof schema.users.$inferSelect {
	const inserted = testDb.db
		.insert(schema.users)
		.values({
			username: userData.username,
			passwordHash: userData.passwordHash,
			role: userData.role ?? "user",
		})
		.returning()
		.get();
	return inserted;
}

/**
 * Create a test file and return the file data
 */
export function createTestFile(
	testDb: TestDb,
	fileData: {
		name: string;
		path: string;
		size: number;
		mimeType: string;
		hash: string;
		uploadedBy?: number;
		parentId?: number;
		metadata?: unknown;
	},
): typeof schema.files.$inferSelect {
	const inserted = testDb.db
		.insert(schema.files)
		.values({
			name: fileData.name,
			path: fileData.path,
			size: fileData.size,
			mimeType: fileData.mimeType,
			hash: fileData.hash,
			uploadedBy: fileData.uploadedBy ?? null,
			parentId: fileData.parentId ?? null,
			metadata: fileData.metadata ?? null,
		})
		.returning()
		.get();
	return inserted;
}

/**
 * Create a test folder and return the folder data
 */
export function createTestFolder(
	testDb: TestDb,
	folderData: {
		name: string;
		path: string;
		parentId: number | null;
		ownerId: number | null;
	},
): typeof schema.folders.$inferSelect {
	const inserted = testDb.db
		.insert(schema.folders)
		.values({
			name: folderData.name,
			path: folderData.path,
			parentId: folderData.parentId,
			ownerId: folderData.ownerId,
		})
		.returning()
		.get();
	return inserted;
}

/**
 * Create a test share with settings and return both
 */
export function createTestShare(
	testDb: TestDb,
	shareData: {
		type: string;
		targetId: number;
		token: string;
		createdBy?: number | null;
		expiresAt?: Date | null;
		passwordHash?: string | null;
	},
	settingsData?: {
		allowDownload?: boolean;
		allowZip?: boolean;
		showMetadata?: boolean;
	},
): { share: typeof schema.shares.$inferSelect; settings: typeof schema.shareSettings.$inferSelect } {
	const share = testDb.db
		.insert(schema.shares)
		.values({
			type: shareData.type,
			targetId: shareData.targetId,
			token: shareData.token,
			createdBy: shareData.createdBy ?? null,
			expiresAt: shareData.expiresAt ?? null,
			passwordHash: shareData.passwordHash ?? null,
		})
		.returning()
		.get();

	const settings = testDb.db
		.insert(schema.shareSettings)
		.values({
			shareId: share.id,
			allowDownload: settingsData?.allowDownload ?? true,
			allowZip: settingsData?.allowZip ?? false,
			showMetadata: settingsData?.showMetadata ?? true,
		})
		.returning()
		.get();

	return { share, settings };
}

/**
 * Clear all data from the test database.
 * Tables are deleted in dependency order (children before parents).
 */
export function clearTestDatabase(testDb: TestDb): void {
	const tables = [
		"zip_jobs",
		"user_settings",
		"subtitles",
		"video_tracks",
		"transcode_jobs",
		"share_settings",
		"shares",
		"files",
		"folders",
		"refresh_tokens",
		"users",
	];
	for (const table of tables) {
		testDb.sqlite.exec(`DELETE FROM ${table}`);
	}
}
