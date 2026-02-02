import { createWriteStream, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { File } from "@petrel/shared";
import archiver from "archiver";
import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { zipJobs } from "../../db/schema";
import { config } from "../config";
import { createEventPayload, eventBus } from "../events/bus";
import { logger } from "../lib/logger";
import { getQueueConfig } from "../queues/connection";
import { fileService } from "../services/file.service";
import { folderService } from "../services/folder.service";

interface ZipJobData {
	jobDbId: number;
	jobId: string;
	fileIds: number[];
	folderIds: number[];
	shareToken?: string;
	userId?: number;
	tempPath: string;
	totalSize: number;
}

const TEMP_DIR = join(tmpdir(), "petrel-zip");
const COMPRESSION_LEVEL = config.ZIP_COMPRESSION_LEVEL;

export function createZipWorker(): Worker | null {
	if (!config.REDIS_URL) {
		logger.info("Redis not configured, zip worker not created (using in-memory processing)");
		return null;
	}

	const queueConfig = getQueueConfig("zip");
	const concurrency = queueConfig?.concurrency ?? 2;

	const worker = new Worker<ZipJobData>(
		"zip",
		async (job: Job<ZipJobData>) => {
			const { jobDbId, jobId, fileIds, folderIds, tempPath, totalSize } = job.data;

			logger.info({ jobId, fileCount: fileIds.length + folderIds.length }, "Processing zip job");

			await db
				.update(zipJobs)
				.set({ status: "processing", progress: 0 })
				.where(eq(zipJobs.id, jobDbId));

			try {
				mkdirSync(TEMP_DIR, { recursive: true });

				const entries = await collectEntries(fileIds, folderIds);

				await processZip(job, jobDbId, entries, tempPath, totalSize);

				await db
					.update(zipJobs)
					.set({
						status: "completed",
						progress: 100,
						completedAt: new Date(),
					})
					.where(eq(zipJobs.id, jobDbId));

				eventBus.emit(
					"zip:completed",
					createEventPayload({
						jobId: jobDbId,
						success: true,
					}),
				);

				logger.info({ jobId }, "Zip job completed");
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";

				logger.error({ jobId, error: errorMessage }, "Zip job failed");

				await db
					.update(zipJobs)
					.set({
						status: "failed",
						error: errorMessage,
					})
					.where(eq(zipJobs.id, jobDbId));

				eventBus.emit(
					"zip:completed",
					createEventPayload({
						jobId: jobDbId,
						success: false,
						error: errorMessage,
					}),
				);

				throw error;
			}
		},
		{
			connection: { url: config.REDIS_URL },
			concurrency,
		},
	);

	worker.on("completed", (job) => {
		logger.debug({ jobId: job.id }, "Zip worker job completed");
	});

	worker.on("failed", (job, err) => {
		logger.error({ jobId: job?.id, err }, "Zip worker job failed");
	});

	logger.info({ concurrency }, "Zip worker created");
	return worker;
}

async function collectEntries(
	fileIds: number[],
	folderIds: number[],
): Promise<Array<{ file: File; entryPath: string }>> {
	const entries: Array<{ file: File; entryPath: string }> = [];

	for (const fileId of fileIds) {
		const file = await fileService.getById(fileId);
		if (file) {
			entries.push({ file, entryPath: file.name });
		}
	}

	for (const folderId of folderIds) {
		const folder = await folderService.getById(folderId);
		if (folder) {
			await collectFilesFromFolder(folder, folder.name, entries);
		}
	}

	return entries;
}

async function collectFilesFromFolder(
	folder: { id: number; name: string; path: string },
	basePath: string,
	entries: Array<{ file: File; entryPath: string }>,
): Promise<void> {
	const pageSize = 500;
	let offset = 0;

	while (true) {
		const { files: batch, total } = await fileService.listByPath(folder.path, pageSize, offset);
		for (const file of batch) {
			entries.push({ file, entryPath: join(basePath, file.name) });
		}
		offset += batch.length;
		if (offset >= total || batch.length === 0) {
			break;
		}
	}

	const subfolders = await folderService.listByParentId(folder.id);
	for (const subfolder of subfolders) {
		await collectFilesFromFolder(subfolder, join(basePath, subfolder.name), entries);
	}
}

async function processZip(
	job: Job<ZipJobData>,
	jobDbId: number,
	entries: Array<{ file: File; entryPath: string }>,
	tempPath: string,
	totalBytes: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const archiveInstance = archiver("zip", { zlib: { level: COMPRESSION_LEVEL } });
		const output = createWriteStream(tempPath);

		let processedBytes = 0;
		let archiveError: Error | null = null;

		output.on("close", async () => {
			if (archiveError) {
				reject(archiveError);
			} else {
				await db
					.update(zipJobs)
					.set({ progress: 100 })
					.where(eq(zipJobs.id, jobDbId))
					.catch(() => {});
				resolve();
			}
		});

		archiveInstance.on("error", (err: Error) => {
			archiveError = err;
			reject(err);
		});

		archiveInstance.on("progress", async (data: { fs: { processedBytes: number } }) => {
			processedBytes = data.fs.processedBytes;
			const progress =
				totalBytes > 0 ? Math.min(100, Math.round((processedBytes / totalBytes) * 100)) : 100;

			await job.updateProgress(progress);
			await db
				.update(zipJobs)
				.set({ progress })
				.where(eq(zipJobs.id, jobDbId))
				.catch(() => {});
		});

		archiveInstance.pipe(output);

		for (const entry of entries) {
			const filePath = fileService.resolveDiskPath(entry.file);
			archiveInstance.file(filePath, { name: entry.entryPath });
		}

		archiveInstance.finalize();
	});
}

export async function closeZipWorker(worker: Worker | null): Promise<void> {
	if (worker) {
		await worker.close();
		logger.info("Zip worker closed");
	}
}
