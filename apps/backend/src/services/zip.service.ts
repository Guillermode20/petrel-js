import { createWriteStream, mkdir } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import archiver from "archiver";
import type { File } from "@petrel/shared";
import { fileService } from "./file.service";

export interface ZipJob {
	fileIds: number[];
	shareToken: string;
	status: "pending" | "processing" | "completed" | "error";
	progress: number;
	tempPath?: string;
	error?: string;
	createdAt: Date;
}

const MAX_ZIP_SIZE = 2 * 1024 * 1024 * 1024; // 2GB limit
const MAX_FILES = 100;
const TEMP_DIR = join(tmpdir(), "petrel-zip");

// Simple in-memory job store (consider Redis for production)
const zipJobs = new Map<string, ZipJob>();

/**
 * Validates files for ZIP creation
 */
function validateFiles(files: File[]): { valid: true } | { valid: false; error: string } {
	if (files.length === 0) {
		return { valid: false, error: "No files selected" };
	}

	if (files.length > MAX_FILES) {
		return { valid: false, error: `Maximum ${MAX_FILES} files allowed per ZIP` };
	}

	const totalSize = files.reduce((sum, f) => sum + f.size, 0);
	if (totalSize > MAX_ZIP_SIZE) {
		return { valid: false, error: "Selected files exceed 2GB limit" };
	}

	return { valid: true };
}

/**
 * Creates a ZIP archive from files
 */
export async function createZipArchive(
	files: File[],
	shareToken: string,
	jobId: string,
): Promise<{ success: true; path: string; size: number } | { success: false; error: string }> {
	const validation = validateFiles(files);
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}

	// Ensure temp directory exists
	await mkdir(TEMP_DIR, { recursive: true });

	const tempPath = join(TEMP_DIR, `${jobId}.zip`);

	return new Promise((resolve, reject) => {
		const output = createWriteStream(tempPath);
		const archive = archiver("zip", { zlib: { level: 6 } });

		let processedBytes = 0;
		const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

		// Update job status
		const job: ZipJob = {
			fileIds: files.map((f) => f.id),
			shareToken,
			status: "processing",
			progress: 0,
			tempPath,
			createdAt: new Date(),
		};
		zipJobs.set(jobId, job);

		output.on("close", () => {
			job.status = "completed";
			job.progress = 100;
			zipJobs.set(jobId, job);

			// Clean up old jobs periodically
			cleanupOldJobs();

			stat(tempPath)
				.then((stats) => resolve({ success: true, path: tempPath, size: stats.size }))
				.catch((err) => resolve({ success: false, error: err.message }));
		});

		archive.on("error", (err) => {
			job.status = "error";
			job.error = err.message;
			zipJobs.set(jobId, job);
			reject(err);
		});

		archive.on("progress", ({ fs: { processedBytes: bytes } }) => {
			const progress = Math.round((bytes / totalBytes) * 100);
			job.progress = progress;
			zipJobs.set(jobId, job);
		});

		archive.pipe(output);

		// Add files to archive
		for (const file of files) {
			const filePath = fileService.resolveDiskPath(file);
			archive.file(filePath, { name: file.name });
		}

		archive.finalize();
	});
}

/**
 * Gets job status
 */
export function getZipJob(jobId: string): ZipJob | undefined {
	return zipJobs.get(jobId);
}

/**
 * Cleans up a ZIP file
 */
export async function cleanupZip(jobId: string): Promise<void> {
	const job = zipJobs.get(jobId);
	if (job?.tempPath) {
		try {
			await unlink(job.tempPath);
		} catch {
			// Ignore errors
		}
		zipJobs.delete(jobId);
	}
}

/**
 * Cleans up jobs older than 1 hour
 */
function cleanupOldJobs(): void {
	const oneHourAgo = Date.now() - 60 * 60 * 1000;
	for (const [jobId, job] of zipJobs) {
		if (job.createdAt.getTime() < oneHourAgo) {
			void cleanupZip(jobId);
		}
	}
}

/**
 * Generates a unique job ID
 */
export function generateJobId(): string {
	return `zip-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
