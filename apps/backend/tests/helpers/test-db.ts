import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../../db/schema";

/**
 * Test database utilities for integration testing.
 * Uses in-memory SQLite for fast, isolated tests.
 */

export interface TestDb {
	db: ReturnType<typeof drizzle>;
	sqlite: Database;
	close: () => void;
}

/**
 * Create an in-memory test database with the full schema
 */
export function createTestDatabase(): TestDb {
	const sqlite = new Database(":memory:");

	// Create tables matching the schema
	sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      revoked_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS refresh_tokens_token_hash_idx ON refresh_tokens(token_hash);

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      hash TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id),
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      parent_id INTEGER REFERENCES folders(id),
      owner_id INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER,
      password_hash TEXT,
      download_count INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS share_settings (
      share_id INTEGER PRIMARY KEY REFERENCES shares(id),
      allow_download INTEGER NOT NULL DEFAULT 1,
      allow_zip INTEGER NOT NULL DEFAULT 0,
      show_metadata INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cover_file_id INTEGER REFERENCES files(id),
      owner_id INTEGER REFERENCES users(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS album_files (
      album_id INTEGER NOT NULL REFERENCES albums(id),
      file_id INTEGER NOT NULL REFERENCES files(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (album_id, file_id)
    );

    CREATE TABLE IF NOT EXISTS transcode_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL REFERENCES files(id),
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER NOT NULL DEFAULT 0,
      output_path TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      completed_at INTEGER,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS video_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL REFERENCES files(id),
      track_type TEXT NOT NULL,
      codec TEXT NOT NULL,
      language TEXT,
      "index" INTEGER NOT NULL,
      title TEXT
    );

    CREATE TABLE IF NOT EXISTS subtitles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL REFERENCES files(id),
      language TEXT NOT NULL,
      path TEXT NOT NULL,
      format TEXT NOT NULL,
      title TEXT
    );
  `);

	const db = drizzle(sqlite, { schema });

	return {
		db,
		sqlite,
		close: () => sqlite.close(),
	};
}

/**
 * Create a test user and return the user data
 */
export async function createTestUser(
	testDb: TestDb,
	userData: { username: string; passwordHash: string; role?: string },
): Promise<typeof schema.users.$inferSelect> {
	const result = testDb.sqlite
		.prepare(`
    INSERT INTO users (username, password_hash, role)
    VALUES (?, ?, ?)
  `)
		.run(userData.username, userData.passwordHash, userData.role ?? "user");

	const user = testDb.sqlite
		.prepare("SELECT * FROM users WHERE id = ?")
		.get(result.lastInsertRowid);
	return user as typeof schema.users.$inferSelect;
}

/**
 * Create a test file and return the file data
 */
export async function createTestFile(
	testDb: TestDb,
	fileData: {
		name: string;
		path: string;
		size: number;
		mimeType: string;
		hash: string;
		uploadedBy?: number;
	},
): Promise<typeof schema.files.$inferSelect> {
	const result = testDb.sqlite
		.prepare(`
    INSERT INTO files (name, path, size, mime_type, hash, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
		.run(
			fileData.name,
			fileData.path,
			fileData.size,
			fileData.mimeType,
			fileData.hash,
			fileData.uploadedBy ?? null,
		);

	const file = testDb.sqlite
		.prepare("SELECT * FROM files WHERE id = ?")
		.get(result.lastInsertRowid) as Record<string, unknown>;

	// Map snake_case columns to camelCase
	return {
		id: file.id as number,
		name: file.name as string,
		path: file.path as string,
		size: file.size as number,
		mimeType: file.mime_type as string,
		hash: file.hash as string,
		uploadedBy: file.uploaded_by as number | null,
		metadata: file.metadata as unknown,
		createdAt: file.created_at ? new Date((file.created_at as number) * 1000) : new Date(),
	};
}

/**
 * Clear all data from the test database
 */
export function clearTestDatabase(testDb: TestDb): void {
	const tables = [
		"album_files",
		"albums",
		"subtitles",
		"video_tracks",
		"transcode_jobs",
		"share_settings",
		"shares",
		"folders",
		"files",
		"refresh_tokens",
		"users",
	];

	for (const table of tables) {
		testDb.sqlite.exec(`DELETE FROM ${table}`);
	}
}
