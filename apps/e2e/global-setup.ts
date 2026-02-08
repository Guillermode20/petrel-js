import { rm, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Attempt to remove a file with retries for EBUSY/EPERM errors
 */
async function removeFileWithRetry(filePath: string, retries = 3, delayMs = 500): Promise<boolean> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await unlink(filePath);
			return true;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === "ENOENT") return false;
			if ((code === "EBUSY" || code === "EPERM") && attempt < retries) {
				console.log(`  ⏳ File busy, retrying in ${delayMs}ms (attempt ${attempt}/${retries})...`);
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				continue;
			}
			console.log(`  ⚠ Could not remove ${path.basename(filePath)}: ${(error as Error).message}`);
			return false;
		}
	}
	return false;
}

/**
 * Clean up all test data via the backend API.
 * Used as a fallback when the DB file is locked (server already running).
 */
async function cleanupViaApi(backendUrl: string): Promise<boolean> {
	try {
		// Login as admin
		const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username: "admin", password: "admin123" }),
		});
		if (!loginRes.ok) return false;

		const loginBody = (await loginRes.json()) as { data: { accessToken: string } };
		const headers: Record<string, string> = {
			Authorization: `Bearer ${loginBody.data.accessToken}`,
		};

		// Delete all shares first (they reference files/folders)
		const sharesRes = await fetch(`${backendUrl}/api/shares`, { headers });
		if (sharesRes.ok) {
			const sharesBody = (await sharesRes.json()) as { data: { id: number }[] };
			for (const share of sharesBody.data) {
				await fetch(`${backendUrl}/api/shares/${share.id}`, { method: "DELETE", headers });
			}
			if (sharesBody.data.length > 0) {
				console.log(`  ✓ Deleted ${sharesBody.data.length} shares via API`);
			}
		}

		// Paginate through all files and delete them
		let deletedFiles = 0;
		let offset = 0;
		const limit = 200;
		let hasMore = true;

		while (hasMore) {
			const filesRes = await fetch(
				`${backendUrl}/api/files?limit=${limit}&offset=${offset}`,
				{ headers },
			);
			if (!filesRes.ok) break;

			const filesBody = (await filesRes.json()) as {
				data: {
					files: { id: number }[];
					folders: { id: number }[];
					pagination: { total: number };
				};
			};

			// Delete files
			for (const file of filesBody.data.files) {
				await fetch(`${backendUrl}/api/files/${file.id}`, { method: "DELETE", headers });
				deletedFiles++;
			}

			// Delete folders
			for (const folder of filesBody.data.folders) {
				await fetch(`${backendUrl}/api/folders/${folder.id}`, { method: "DELETE", headers });
				deletedFiles++;
			}

			const totalItems = filesBody.data.files.length + filesBody.data.folders.length;
			if (totalItems === 0) {
				hasMore = false;
			}
			// Always re-fetch from offset 0 since items are being deleted
		}

		if (deletedFiles > 0) {
			console.log(`  ✓ Deleted ${deletedFiles} files/folders via API`);
		}

		return true;
	} catch {
		return false;
	}
}

/**
 * Global setup for E2E tests
 * Ensures a clean database and storage state before running tests
 */
export default async function globalSetup(): Promise<void> {
	const currentFilePath = fileURLToPath(import.meta.url);
	const currentDir = path.dirname(currentFilePath);
	const backendDir = path.resolve(currentDir, "..", "backend");
	const testDbPath = path.join(backendDir, "test-e2e.db");
	const testStoragePath = path.join(backendDir, "storage-e2e");
	const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

	console.log("🧹 E2E Global Setup: Cleaning test environment...");

	// Clean database
	const dbRemoved = await removeFileWithRetry(testDbPath);
	if (dbRemoved) {
		console.log("  ✓ Removed test database");
	} else {
		console.log("  ℹ Test database clean or skipped");
		// DB is locked — server is running. Clean up via API instead.
		console.log("  ℹ Attempting API-based cleanup...");
		const cleaned = await cleanupViaApi(backendUrl);
		if (cleaned) {
			console.log("  ✓ API-based cleanup complete");
		} else {
			console.log("  ⚠ API-based cleanup failed (server may not be running yet)");
		}
	}

	// Clean WAL/SHM files (SQLite journal files)
	await removeFileWithRetry(`${testDbPath}-wal`);
	await removeFileWithRetry(`${testDbPath}-shm`);

	// Clean storage directory
	try {
		await rm(testStoragePath, { recursive: true, force: true });
		console.log("  ✓ Removed test storage directory");
	} catch {
		console.log("  ℹ Test storage directory clean or skipped");
	}

	console.log("✓ E2E Global Setup complete\n");
}
