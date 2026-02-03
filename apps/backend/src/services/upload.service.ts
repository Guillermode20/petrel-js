import { readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { File } from "@petrel/shared";
import type { BunFile } from "bun";
import {
	buildFileRelativePath,
	calculateFileHash,
	ensureDirectory,
	getChunkDirectoryRelativePath,
	getChunkRelativePath,
	pathExists,
	resolveStoragePath,
} from "../lib/storage";
import { logger } from "../lib/logger";
import { type FileService, fileService } from "./file.service";
import { type FolderService, folderService } from "./folder.service";
import { type MetadataService, metadataService } from "./metadata.service";

export interface ChunkUploadParams {
	uploadId: string;
	chunkIndex: number;
	totalChunks: number;
	fileName: string;
	folderPath: string;
	mimeType: string;
	chunk: Blob;
	userId: number;
}

export interface UploadResult {
	file: File | null;
	allChunksPresent: boolean;
}

export class UploadService {
	private activeFinalizations = new Set<string>();

	constructor(
		private fileService: FileService,
		private folderService: FolderService,
		private metadataService: MetadataService,
	) {}

	async handleChunk(params: ChunkUploadParams): Promise<UploadResult> {
		await this.writeChunk(params.chunk, params.uploadId, params.chunkIndex);
		const allChunksPresent = await this.areAllChunksPresent(params.uploadId, params.totalChunks);

		if (!allChunksPresent) {
			return { file: null, allChunksPresent: false };
		}

		// Prevent race condition where multiple chunks triggering finalization
		if (this.activeFinalizations.has(params.uploadId)) {
			return { file: null, allChunksPresent: true };
		}

		this.activeFinalizations.add(params.uploadId);

		try {
			const created = await this.finalizeUpload({
				uploadId: params.uploadId,
				totalChunks: params.totalChunks,
				folderPath: params.folderPath,
				fileName: params.fileName,
				mimeType: params.mimeType,
				userId: params.userId,
			});

			return { file: created, allChunksPresent: true };
		} finally {
			this.activeFinalizations.delete(params.uploadId);
		}
	}

	async fileExists(folderPath: string, fileName: string): Promise<boolean> {
		const file = await this.fileService.findByPathAndName(folderPath, fileName);
		return file !== null;
	}

	/**
	 * Cleans up abandoned chunk uploads older than the specified max age
	 */
	async cleanupOldUploads(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
		const chunksRoot = resolveStoragePath(".chunks");
		const exists = await pathExists(chunksRoot);
		if (!exists) return;

		const uploadDirs = await readdir(chunksRoot).catch(() => []);
		const now = Date.now();

		for (const uploadId of uploadDirs) {
			const dirPath = join(chunksRoot, uploadId);
			try {
				const stats = await stat(dirPath);
				const age = now - stats.mtimeMs;

				if (age > maxAgeMs) {
					logger.info({ uploadId, ageHours: Math.round(age / 3600000) }, "Cleaning up abandoned upload");
					await rm(dirPath, { recursive: true, force: true });
				}
			} catch (err) {
				logger.error({ uploadId, error: err instanceof Error ? err.message : String(err) }, "Failed to stat upload directory");
			}
		}
	}

	private async writeChunk(chunk: Blob, uploadId: string, chunkIndex: number): Promise<void> {
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

		const folder = await this.folderService.getFolderByPath(params.folderPath);
		const parentId = folder?.id ?? null;

		const created = await this.fileService.createFile({
			name: params.fileName,
			path: params.folderPath,
			size,
			mimeType: params.mimeType,
			hash: fileHash,
			uploadedBy: params.userId,
			parentId,
			metadata: null,
		});

		const updated = await this.metadataService.enrichMetadata(created);
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
}

export const uploadService = new UploadService(fileService, folderService, metadataService);
