import { readdir, rename, rm, unlink } from "node:fs/promises";
import path from "node:path";
import type { File } from "@petrel/shared";
import type { BunFile } from "bun";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { files, subtitles, transcodeJobs, videoTracks } from "../../db/schema";
import { cacheManager, Cacheable, CacheEvict, cacheKeys, cacheTTL } from "../cache";
import {
	buildFileRelativePath,
	calculateFileHash,
	ensureDirectory,
	getChunkDirectoryRelativePath,
	getChunkRelativePath,
	normalizeRelativePath,
	resolveStoragePath,
} from "../lib/storage";
import { folderService } from "./folder.service";
import { metadataService } from "./metadata.service";

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
		await unlink(diskPath).catch(() => null);
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
				await rm(absoluteDir, { recursive: true, force: true }).catch(() => null);
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
		const normalizedOld = normalizeRelativePath(oldFolderPath);
		const normalizedNew = normalizeRelativePath(newFolderPath);

		// Use string concatenation to safely replace only the prefix
		await db
			.update(files)
			.set({
				path: sql`${normalizedNew} || substr(path, length(${normalizedOld}) + 1)`,
			})
			.where(sql`path = ${normalizedOld} OR path LIKE ${`${normalizedOld}/%`}`);
	}

	async deleteFile(id: number): Promise<File | null> {
		const current = await this.getById(id);
		if (!current) return null;

		// Evict caches before deletion: file by ID, path-based cache, and file lists
		await Promise.all([
			cacheManager.del(cacheKeys.file(id)),
			cacheManager.del(`petrel:file:path:${normalizeRelativePath(current.path)}/${current.name}`),
			cacheManager.delPattern(cacheKeys.pattern.fileLists()),
		]);

		await this.deletePrimaryFileOnDisk(current);
		await this.deleteDerivedAssets(id);
		await Promise.all([
			db.delete(videoTracks).where(eq(videoTracks.fileId, id)),
			db.delete(subtitles).where(eq(subtitles.fileId, id)),
			db.delete(transcodeJobs).where(eq(transcodeJobs.fileId, id)),
		]);

		await db.delete(files).where(eq(files.id, id));
		return current;
	}

	@CacheEvict({ key: (id: number) => cacheKeys.file(id) })
	async updateMetadata(id: number, metadata: File["metadata"] | null): Promise<File | null> {
		if (!metadata) return await this.getById(id);

		const updated = await db.update(files).set({ metadata }).where(eq(files.id, id)).returning();

		await Promise.all([
			cacheManager.del(cacheKeys.file(id)),
			cacheManager.delPattern(cacheKeys.pattern.fileLists()),
		]);

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

			await Promise.all([
				cacheManager.del(cacheKeys.file(id)),
				cacheManager.delPattern(cacheKeys.pattern.fileLists()),
			]);

			return this.mapFileRow(updatedRow);
		} catch (err) {
			await Bun.file(tempPath)
				.delete()
				.catch(() => {});
			throw err;
		}
	}

	async handleChunkUpload(params: {
		uploadId: string;
		chunkIndex: number;
		totalChunks: number;
		fileName: string;
		folderPath: string;
		mimeType: string;
		chunk: Blob;
		userId: number;
	}): Promise<{ file: File | null; allChunksPresent: boolean }> {
		await this.writeChunkToDisk(params.chunk, params.uploadId, params.chunkIndex);
		const allChunksPresent = await this.areAllChunksPresent(params.uploadId, params.totalChunks);

		if (!allChunksPresent) {
			return { file: null, allChunksPresent: false };
		}

		const created = await this.finalizeUpload({
			uploadId: params.uploadId,
			totalChunks: params.totalChunks,
			folderPath: params.folderPath,
			fileName: params.fileName,
			mimeType: params.mimeType,
			userId: params.userId,
		});

		return { file: created, allChunksPresent: true };
	}

	private async writeChunkToDisk(chunk: Blob, uploadId: string, chunkIndex: number): Promise<void> {
		const chunkDir = getChunkDirectoryRelativePath(uploadId);
		await ensureDirectory(chunkDir);

		const chunkPath = resolveStoragePath(getChunkRelativePath(uploadId, chunkIndex));
		await Bun.write(chunkPath, chunk);
	}

	private async areAllChunksPresent(uploadId: string, totalChunks: number): Promise<boolean> {
		const chunkDir = resolveStoragePath(getChunkDirectoryRelativePath(uploadId));
		const entries = await readdir(chunkDir).catch(() => []);
		return entries.length >= totalChunks;
	}

	private async finalizeUpload(params: {
		uploadId: string;
		totalChunks: number;
		folderPath: string;
		fileName: string;
		mimeType: string;
		userId: number;
	}): Promise<File> {
		const finalRelativePath = buildFileRelativePath(params.folderPath, params.fileName);
		const finalPath = resolveStoragePath(finalRelativePath);
		await ensureDirectory(params.folderPath);
		await this.assembleChunks(params.uploadId, params.totalChunks, finalPath);

		const fileHash = await calculateFileHash(finalPath);
		const size = Bun.file(finalPath).size;

		const folder = await folderService.getFolderByPath(params.folderPath);
		const parentId = folder?.id ?? null;

		const created = await this.createFile({
			name: params.fileName,
			path: params.folderPath,
			size,
			mimeType: params.mimeType,
			hash: fileHash,
			uploadedBy: params.userId,
			parentId,
			metadata: null,
		});

		const updated = await metadataService.enrichMetadata(created);
		return updated ?? created;
	}

	private async assembleChunks(
		uploadId: string,
		totalChunks: number,
		finalPath: string,
	): Promise<void> {
		const chunkDir = resolveStoragePath(getChunkDirectoryRelativePath(uploadId));
		const writer = Bun.file(finalPath).writer();

		for (let index = 0; index < totalChunks; index += 1) {
			const chunkFileName = index.toString().padStart(6, "0");
			const chunkPath = resolveStoragePath(
				`${getChunkDirectoryRelativePath(uploadId)}/${chunkFileName}`,
			);
			await this.appendFileToWriter(writer, chunkPath);
		}

		await writer.end();
		await rm(chunkDir, { recursive: true, force: true });
	}

	private async appendFileToWriter(
		writer: ReturnType<BunFile["writer"]>,
		chunkPath: string,
	): Promise<void> {
		const stream = Bun.file(chunkPath).stream();
		for await (const data of stream) {
			await writer.write(data as Uint8Array);
		}
	}

	resolveDiskPath(file: File): string {
		const relativePath = buildFileRelativePath(file.path, file.name);
		return resolveStoragePath(relativePath);
	}
}

export const fileService = new FileService();
