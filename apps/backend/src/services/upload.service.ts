import { readdir, rename, rm } from "node:fs/promises";
import type { File } from "@petrel/shared";
import type { BunFile } from "bun";
import {
	buildFileRelativePath,
	calculateFileHash,
	ensureDirectory,
	getChunkDirectoryRelativePath,
	getChunkRelativePath,
	resolveStoragePath,
} from "../lib/storage";
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

	async fileExists(folderPath: string, fileName: string): Promise<boolean> {
		const file = await this.fileService.findByPathAndName(folderPath, fileName);
		return file !== null;
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
