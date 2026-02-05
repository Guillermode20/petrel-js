import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Global setup for E2E tests
 * Ensures a clean database state before running tests
 */
export default async function globalSetup() {
	const currentFilePath = fileURLToPath(import.meta.url);
	const currentDir = path.dirname(currentFilePath);
	const backendDir = path.resolve(currentDir, "..", "backend");
	const testDbPath = path.join(backendDir, "test-e2e.db");

	console.log("🧹 E2E Global Setup: Cleaning test database...");

	try {
		await unlink(testDbPath);
		console.log(`✓ Removed test database: ${testDbPath}`);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			console.log("ℹ Test database doesn't exist (clean state)");
		} else {
			console.log(`⚠ Could not remove test database: ${(error as Error).message}`);
		}
	}

	console.log("✓ E2E Global Setup complete\n");
}
