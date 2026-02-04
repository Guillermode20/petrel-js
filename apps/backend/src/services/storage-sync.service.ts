import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { files } from "../../db/schema";
import { calculateFileHash, getStorageRoot, normalizeRelativePath } from "../lib/storage";
import { fileService } from "./file.service";
import { folderService } from "./folder.service";
import { metadataService } from "./metadata.service";

const IGNORED_STORAGE_DIRECTORIES = new Set<string>([
	".chunks",
	".thumbnails",
	".waveforms",
	".audio",
	".hls",
	".subtitles",
]);

export interface StorageSyncReport {
	orphanedFilesOnDisk: string[];
	orphanedDbFileIds: number[];
	createdFolderCount: number;
	importedFileCount: number;
	databaseRecordCleanupCount: number;
	errors: string[];
}

interface DiskFileEntry {
	relativeFilePath: string;
	folderPath: string;
	fileName: string;
	absolutePath: string;
}

function buildFileKey(folderPath: string, fileName: string): string {
	return folderPath ? `${folderPath}/${fileName}` : fileName;
}

function getMimeTypeFromFileName(fileName: string): string {
	const ext = path.extname(fileName).toLowerCase();

	if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
	if (ext === ".png") return "image/png";
	if (ext === ".webp") return "image/webp";
	if (ext === ".gif") return "image/gif";

	if (ext === ".mp4") return "video/mp4";
	if (ext === ".webm") return "video/webm";
	if (ext === ".mov") return "video/quicktime";
	if (ext === ".mkv") return "video/x-matroska";

	if (ext === ".mp3") return "audio/mpeg";
	if (ext === ".wav") return "audio/wav";
	if (ext === ".flac") return "audio/flac";
	if (ext === ".ogg") return "audio/ogg";
	if (ext === ".opus") return "audio/opus";

	return "application/octet-stream";
}

function shouldIgnoreTopLevelEntryName(name: string): boolean {
	return IGNORED_STORAGE_DIRECTORIES.has(name);
}

async function pathExists(absolutePath: string): Promise<boolean> {
	const result = await stat(absolutePath).catch(() => null);
	return result !== null;
}

async function calculateDiskFileHash(absolutePath: string): Promise<string> {
	if (!(await pathExists(absolutePath))) {
		throw new Error("File missing on disk");
	}
	return await calculateFileHash(absolutePath);
}

export class StorageSyncService {
	async autoImportIfDatabaseEmpty(options: {
		enrichMetadata: boolean;
	}): Promise<StorageSyncReport | null> {
		const fileCount = await this.getDatabaseFileCount();
		if (fileCount > 0) return null;

		const diskEntries = await this.scanPrimaryFilesOnDisk();
		if (diskEntries.length === 0) return null;

		const report: StorageSyncReport = {
			orphanedFilesOnDisk: diskEntries.map((e) => e.relativeFilePath),
			orphanedDbFileIds: [],
			createdFolderCount: 0,
			importedFileCount: 0,
			databaseRecordCleanupCount: 0,
			errors: [],
		};

		const folderPathsToEnsure = new Set<string>();
		for (const entry of diskEntries) {
			if (entry.folderPath) folderPathsToEnsure.add(entry.folderPath);
		}

		report.createdFolderCount = await this.ensureFolderPathsExist(Array.from(folderPathsToEnsure));
		await this.importDiskEntries(diskEntries, report, { enrichMetadata: options.enrichMetadata });
		return report;
	}

	async validateSync(): Promise<StorageSyncReport> {
		const report: StorageSyncReport = {
			orphanedFilesOnDisk: [],
			orphanedDbFileIds: [],
			createdFolderCount: 0,
			importedFileCount: 0,
			databaseRecordCleanupCount: 0,
			errors: [],
		};

		const [diskFiles, dbRows] = await Promise.all([
			this.scanPrimaryFilesOnDisk(),
			db.query.files.findMany({
				columns: { id: true, path: true, name: true },
			}),
		]);

		const diskKeys = new Set<string>();
		for (const entry of diskFiles) {
			diskKeys.add(buildFileKey(entry.folderPath, entry.fileName));
		}

		const dbKeys = new Set<string>();
		for (const row of dbRows) {
			dbKeys.add(buildFileKey(row.path, row.name));
		}

		for (const entry of diskFiles) {
			const key = buildFileKey(entry.folderPath, entry.fileName);
			if (!dbKeys.has(key)) {
				report.orphanedFilesOnDisk.push(entry.relativeFilePath);
			}
		}

		for (const row of dbRows) {
			const key = buildFileKey(row.path, row.name);
			if (!diskKeys.has(key)) {
				report.orphanedDbFileIds.push(row.id);
			}
		}

		return report;
	}

	async importOrphanedFiles(options: { enrichMetadata: boolean }): Promise<StorageSyncReport> {
		const report = await this.validateSync();
		const diskEntries = await this.scanPrimaryFilesOnDisk();

		const orphanedSet = new Set<string>(report.orphanedFilesOnDisk);
		const orphanedEntries = diskEntries.filter((e) => orphanedSet.has(e.relativeFilePath));

		const folderPathsToEnsure = new Set<string>();
		for (const entry of orphanedEntries) {
			if (entry.folderPath) folderPathsToEnsure.add(entry.folderPath);
		}

		report.createdFolderCount = await this.ensureFolderPathsExist(Array.from(folderPathsToEnsure));

		await this.importDiskEntries(orphanedEntries, report, {
			enrichMetadata: options.enrichMetadata,
		});

		return report;
	}

	async cleanupOrphanedDatabaseRecords(): Promise<StorageSyncReport> {
		const report = await this.validateSync();

		for (const fileId of report.orphanedDbFileIds) {
			try {
				await fileService.deleteFile(fileId);
				report.databaseRecordCleanupCount += 1;
			} catch (err) {
				report.errors.push(
					`Failed to cleanup DB fileId=${fileId}: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}

		return report;
	}

	private async scanPrimaryFilesOnDisk(): Promise<DiskFileEntry[]> {
		const storageRoot = getStorageRoot();
		const stack: Array<{ absolute: string; relative: string }> = [
			{ absolute: storageRoot, relative: "" },
		];
		const results: DiskFileEntry[] = [];

		while (stack.length > 0) {
			const next = stack.pop();
			if (!next) break;

			const entries = await readdir(next.absolute, { withFileTypes: true }).catch(() => null);
			if (!entries) continue;

			for (const entry of entries) {
				const nextRelative = next.relative
					? path.posix.join(next.relative, entry.name)
					: entry.name;
				const nextAbsolute = path.join(next.absolute, entry.name);

				if (entry.isDirectory()) {
					if (!next.relative && shouldIgnoreTopLevelEntryName(entry.name)) {
						continue;
					}
					stack.push({ absolute: nextAbsolute, relative: nextRelative });
					continue;
				}

				if (!entry.isFile()) continue;

				const folderPath = normalizeRelativePath(path.posix.dirname(nextRelative));
				const fileName = path.posix.basename(nextRelative);
				results.push({
					relativeFilePath: normalizeRelativePath(nextRelative),
					folderPath: folderPath === "." ? "" : folderPath,
					fileName,
					absolutePath: nextAbsolute,
				});
			}
		}

		return results;
	}

	private async ensureFolderPathsExist(folderPaths: string[]): Promise<number> {
		const normalized = folderPaths.map((p) => normalizeRelativePath(p)).filter((p) => p !== "");
		const sorted = normalized.sort((a, b) => a.split("/").length - b.split("/").length);

		let createdCount = 0;
		for (const folderPath of sorted) {
			const existing = await folderService.getFolderByPath(folderPath);
			if (existing) continue;

			const parentPath = normalizeRelativePath(path.posix.dirname(folderPath));
			const name = path.posix.basename(folderPath);

			await folderService.createFolder({
				name,
				parentPath: parentPath === "." ? "" : parentPath,
				ownerId: null,
			});
			createdCount += 1;
		}

		return createdCount;
	}

	private async getDatabaseFileCount(): Promise<number> {
		const rows = await db.select({ count: sql<number>`count(*)` }).from(files);
		return rows[0]?.count ?? 0;
	}

	private async importDiskEntries(
		entries: DiskFileEntry[],
		report: StorageSyncReport,
		options: { enrichMetadata: boolean },
	): Promise<void> {
		for (const entry of entries) {
			try {
				const fileHash = await calculateDiskFileHash(entry.absolutePath);
				const size = Bun.file(entry.absolutePath).size;
				const mimeType = getMimeTypeFromFileName(entry.fileName);
				const parentFolder = entry.folderPath
					? await folderService.getFolderByPath(entry.folderPath)
					: null;

				const created = await fileService.createFile({
					name: entry.fileName,
					path: entry.folderPath,
					size,
					mimeType,
					hash: fileHash,
					uploadedBy: null,
					parentId: parentFolder?.id ?? null,
					metadata: null,
				});

				report.importedFileCount += 1;
				if (options.enrichMetadata) {
					await metadataService.enrichMetadata(created);
				}
			} catch (err) {
				report.errors.push(
					`Failed to import '${entry.relativeFilePath}': ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}
	}
}

export const storageSyncService = new StorageSyncService();
