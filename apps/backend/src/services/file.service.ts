import { rename, rm, unlink } from "node:fs/promises";
import path from "node:path";
import type { File } from "@petrel/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { files, subtitles, transcodeJobs, videoTracks } from "../../db/schema";
import { Cacheable, CacheEvict, cacheKeys, cacheManager, cacheTTL } from "../cache";
import { logger } from "../lib/logger";
import {
	buildFileRelativePath,
	calculateFileHash,
	normalizeRelativePath,
	resolveStoragePath,
} from "../lib/storage";
import type { DatabaseTransaction } from "../types/db";

export interface FileListResult {
	files: File[];
	total: number;
}

export interface CreateFileInput {
	name: string;
	path: string;
	size: number;
	mimeType: string;
	hash: string;
	uploadedBy: number | null;
	parentId: number | null;
	metadata: File["metadata"] | null;
}

export interface UpdateFileInput {
	name?: string;
	path?: string;
}

export class FileService {
	private async deletePrimaryFileOnDisk(file: File): Promise<void> {
		const diskPath = this.resolveDiskPath(file);
		await unlink(diskPath).catch((err) => {
			logger.warn(
				{
					err: err instanceof Error ? err.message : String(err),
					fileId: file.id,
					diskPath,
				},
				"Failed to delete file from disk",
			);
		});
	}

	private async deleteDerivedAssets(fileId: number): Promise<void> {
		const directoriesToRemove = [
			path.posix.join(".thumbnails", fileId.toString()),
			path.posix.join(".waveforms", fileId.toString()),
			path.posix.join(".audio", fileId.toString()),
			path.posix.join(".hls", fileId.toString()),
			path.posix.join(".subtitles", fileId.toString()),
		];

		await Promise.all(
			directoriesToRemove.map(async (relativeDir) => {
				const absoluteDir = resolveStoragePath(relativeDir);
				await rm(absoluteDir, { recursive: true, force: true }).catch((err) => {
					logger.warn(
						{
							err: err instanceof Error ? err.message : String(err),
							fileId,
							absoluteDir,
						},
						"Failed to remove derived assets directory",
					);
				});
			}),
		);
	}

	private mapFileRow(row: typeof files.$inferSelect): File {
		let metadataValue = row.metadata as File["metadata"] | string | null | undefined;
		if (typeof metadataValue === "string") {
			try {
				metadataValue = JSON.parse(metadataValue) as File["metadata"];
			} catch {
				metadataValue = null;
			}
		}
		return {
			id: row.id,
			name: row.name,
			path: row.path,
			size: row.size,
			mimeType: row.mimeType,
			hash: row.hash,
			uploadedBy: row.uploadedBy,
			parentId: row.parentId,
			thumbnailPath: row.thumbnailPath,
			createdAt: row.createdAt,
			metadata: metadataValue ?? undefined,
		};
	}

	@Cacheable({
		key: (folderPath: string, limit: number, offset: number, search?: string) =>
			cacheKeys.fileList(folderPath, limit, offset, search),
		ttl: cacheTTL.fileList,
		condition: (_folderPath: string, _limit: number, _offset: number, search?: string) => !search, // Don't cache search results
	})
	async listByPath(
		folderPath: string,
		limit: number,
		offset: number,
		search?: string,
	): Promise<FileListResult> {
		const normalizedPath = normalizeRelativePath(folderPath);

		const conditions = [];

		// When search is provided, search recursively in subfolders
		// When search is NOT provided, only search in current folder
		if (search) {
			// Recursive: files in current folder OR any subfolder
			if (normalizedPath === "") {
				// Root folder: search all files
				conditions.push(sql`1 = 1`);
			} else {
				// Current folder or subfolders
				const pathPattern = `${normalizedPath}/%`;
				conditions.push(
					sql`(${files.path} = ${normalizedPath} OR ${files.path} LIKE ${pathPattern})`,
				);
			}
			const searchPattern = `%${search}%`;
			conditions.push(sql`lower(${files.name}) LIKE lower(${searchPattern})`);
		} else {
			// Non-recursive: only files in current folder
			conditions.push(eq(files.path, normalizedPath));
		}

		const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

		const fileRows = await db.query.files.findMany({
			where: whereClause,
			limit,
			offset,
		});

		const countRows = await db
			.select({ count: sql<number>`count(*)` })
			.from(files)
			.where(whereClause);

		return {
			files: fileRows.map((row) => this.mapFileRow(row)),
			total: countRows[0]?.count ?? 0,
		};
	}

	@Cacheable({ key: (id: number) => cacheKeys.file(id), ttl: cacheTTL.file })
	async getById(id: number): Promise<File | null> {
		const file = await db.query.files.findFirst({
			where: eq(files.id, id),
		});

		return file ? this.mapFileRow(file) : null;
	}

	@Cacheable({
		key: (folderPath: string, name: string) =>
			`petrel:file:path:${normalizeRelativePath(folderPath)}/${name}`,
		ttl: cacheTTL.file,
	})
	async findByPathAndName(folderPath: string, name: string): Promise<File | null> {
		const normalizedPath = normalizeRelativePath(folderPath);
		const file = await db.query.files.findFirst({
			where: and(eq(files.path, normalizedPath), eq(files.name, name)),
		});

		return file ? this.mapFileRow(file) : null;
	}

	@CacheEvict({ key: () => cacheKeys.pattern.fileLists(), allEntries: true })
	async createFile(input: CreateFileInput): Promise<File> {
		const normalizedPath = normalizeRelativePath(input.path);
		const inserted = await db
			.insert(files)
			.values({
				name: input.name,
				path: normalizedPath,
				size: input.size,
				mimeType: input.mimeType,
				hash: input.hash,
				uploadedBy: input.uploadedBy,
				parentId: input.parentId,
				metadata: input.metadata,
			})
			.returning();

		const created = inserted[0];
		if (!created) {
			throw new Error("Failed to create file record");
		}

		return this.mapFileRow(created);
	}

	async updateFile(id: number, input: UpdateFileInput): Promise<File | null> {
		const current = await this.getById(id);
		if (!current) return null;

		const nextPath = input.path !== undefined ? normalizeRelativePath(input.path) : current.path;
		const nextName = input.name ?? current.name;

		const updated = await db
			.update(files)
			.set({
				path: nextPath,
				name: nextName,
			})
			.where(eq(files.id, id))
			.returning();

		const updatedRow = updated[0];
		if (!updatedRow) return null;

		// Evict caches: file by ID, old path-based cache, new path-based cache, and file lists
		await Promise.all([
			cacheManager.del(cacheKeys.file(id)),
			cacheManager.del(`petrel:file:path:${normalizeRelativePath(current.path)}/${current.name}`),
			cacheManager.del(`petrel:file:path:${nextPath}/${nextName}`),
			cacheManager.delPattern(cacheKeys.pattern.fileLists()),
		]);

		return this.mapFileRow(updatedRow);
	}

	async updateFilesPathInFolder(oldFolderPath: string, newFolderPath: string): Promise<void> {
		await this.updateFilesPathInFolderInternal(oldFolderPath, newFolderPath, db);
	}

	async updateFilesPathInFolderInternal(
		oldFolderPath: string,
		newFolderPath: string,
		tx: DatabaseTransaction | typeof db,
	): Promise<void> {
		const normalizedOld = normalizeRelativePath(oldFolderPath);
		const normalizedNew = normalizeRelativePath(newFolderPath);

		// Use string concatenation to safely replace only the prefix
		await tx
			.update(files)
			.set({
				path: sql`${normalizedNew} || substr(path, length(${normalizedOld}) + 1)`,
			})
			.where(sql`path = ${normalizedOld} OR path LIKE ${`${normalizedOld}/%`}`);
	}

	async deleteFile(id: number): Promise<File | null> {
		const current = await this.getById(id);
		if (!current) return null;

		return await db.transaction(async (tx) => {
			await tx.delete(videoTracks).where(eq(videoTracks.fileId, id));
			await tx.delete(subtitles).where(eq(subtitles.fileId, id));
			await tx.delete(transcodeJobs).where(eq(transcodeJobs.fileId, id));
			await tx.delete(files).where(eq(files.id, id));

			// Perform side effects only if transaction succeeds
			await this.deletePrimaryFileOnDisk(current);
			await this.deleteDerivedAssets(id);
			await this.invalidateFileCache(id, current);

			return current;
		});
	}

	@CacheEvict({ key: (id: number) => cacheKeys.file(id) })
	async updateMetadata(id: number, metadata: File["metadata"] | null): Promise<File | null> {
		if (!metadata) return await this.getById(id);

		const updated = await db.update(files).set({ metadata }).where(eq(files.id, id)).returning();

		await this.invalidateFileCache(id);

		const updatedRow = updated[0];
		return updatedRow ? this.mapFileRow(updatedRow) : null;
	}

	async updateFileContent(id: number, content: string): Promise<File | null> {
		const current = await this.getById(id);
		if (!current) return null;

		const diskPath = this.resolveDiskPath(current);
		const tempPath = `${diskPath}.tmp`;

		try {
			await Bun.write(tempPath, content);

			const newHash = await calculateFileHash(tempPath);
			const newSize = Bun.file(tempPath).size;

			const updated = await db
				.update(files)
				.set({
					hash: newHash,
					size: newSize,
				})
				.where(eq(files.id, id))
				.returning();

			const updatedRow = updated[0];
			if (!updatedRow) {
				await Bun.file(tempPath).delete();
				return null;
			}

			await rename(tempPath, diskPath);

			await this.invalidateFileCache(id);

			return this.mapFileRow(updatedRow);
		} catch (err) {
			await Bun.file(tempPath)
				.delete()
				.catch((deleteErr) => {
					logger.debug(
						{
							err: deleteErr instanceof Error ? deleteErr.message : String(deleteErr),
							tempPath,
						},
						"Failed to delete temp file (may not exist)",
					);
				});
			throw err;
		}
	}

	private async invalidateFileCache(id: number, file?: File): Promise<void> {
		const promises = [
			cacheManager.del(cacheKeys.file(id)),
			cacheManager.delPattern(cacheKeys.pattern.fileLists()),
		];

		if (file) {
			promises.push(
				cacheManager.del(`petrel:file:path:${normalizeRelativePath(file.path)}/${file.name}`),
			);
		}

		await Promise.all(promises);
	}

	resolveDiskPath(file: File): string {
		const relativePath = buildFileRelativePath(file.path, file.name);
		return resolveStoragePath(relativePath);
	}
}

export const fileService = new FileService();
