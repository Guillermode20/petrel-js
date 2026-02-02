import path from "node:path";
import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { transcodeJobs } from "../../db/schema";
import { config } from "../config";
import { createEventPayload, eventBus } from "../events/bus";
import { transcodeToHLS } from "../lib/ffmpeg";
import { logger } from "../lib/logger";
import { ensureDirectory, resolveStoragePath } from "../lib/storage";
import { getQueueConfig } from "../queues/connection";

interface TranscodeJobData {
	jobId: number;
	fileId: number;
	filePath: string;
	quality: "1080p" | "720p" | "480p";
	hlsDir: string;
}

export function createTranscodeWorker(): Worker | null {
	if (!config.REDIS_URL) {
		logger.info("Redis not configured, transcode worker not created (using in-memory queue)");
		return null;
	}

	const queueConfig = getQueueConfig("transcode");
	const concurrency = queueConfig?.concurrency ?? 2;

	const worker = new Worker<TranscodeJobData>(
		"transcode",
		async (job: Job<TranscodeJobData>) => {
			const { jobId, fileId, filePath, quality, hlsDir } = job.data;

			logger.info({ jobId, fileId }, "Processing transcode job");

			await db
				.update(transcodeJobs)
				.set({ status: "processing", progress: 0 })
				.where(eq(transcodeJobs.id, jobId));

			try {
				const hlsDirAbsolute = resolveStoragePath(hlsDir);
				await ensureDirectory(hlsDirAbsolute);

				await transcodeToHLS({
					inputPath: filePath,
					outputDir: hlsDirAbsolute,
					quality,
					onProgress: async (percent) => {
						await job.updateProgress(percent);
						await db
							.update(transcodeJobs)
							.set({ progress: percent })
							.where(eq(transcodeJobs.id, jobId))
							.catch(() => {});
					},
				});

				await db
					.update(transcodeJobs)
					.set({
						status: "completed",
						progress: 100,
						completedAt: new Date(),
					})
					.where(eq(transcodeJobs.id, jobId));

				eventBus.emit(
					"transcode:completed",
					createEventPayload({
						fileId,
						jobId,
						success: true,
					}),
				);

				logger.info({ jobId, fileId }, "Transcode job completed");
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";

				logger.error({ jobId, fileId, error: errorMessage }, "Transcode job failed");

				await db
					.update(transcodeJobs)
					.set({
						status: "failed",
						error: errorMessage,
					})
					.where(eq(transcodeJobs.id, jobId));

				eventBus.emit(
					"transcode:completed",
					createEventPayload({
						fileId,
						jobId,
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
			limiter: {
				max: 1,
				duration: 1000,
			},
		},
	);

	worker.on("completed", (job) => {
		logger.debug({ jobId: job.id }, "Transcode worker job completed");
	});

	worker.on("failed", (job, err) => {
		logger.error({ jobId: job?.id, err }, "Transcode worker job failed");
	});

	logger.info({ concurrency }, "Transcode worker created");
	return worker;
}

export async function closeTranscodeWorker(worker: Worker | null): Promise<void> {
	if (worker) {
		await worker.close();
		logger.info("Transcode worker closed");
	}
}
