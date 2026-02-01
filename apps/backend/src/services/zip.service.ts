import archiver from "archiver";
import { createWriteStream, mkdirSync } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { File, Folder, Share } from "@petrel/shared";
import { eq, lt } from "drizzle-orm";
import { db } from "../../db";
import { zipJobs } from "../../db/schema";
import { config } from "../config";
import { createChildLogger } from "../lib/logger";
import { normalizeFileName, normalizeRelativePath } from "../lib/storage";
import { fileService } from "./file.service";
import { folderService } from "./folder.service";
import { shareService } from "./share.service";

const logger = createChildLogger({ module: "zip.service" });

const MAX_ZIP_SIZE = config.ZIP_MAX_SIZE_BYTES;
const MAX_FILES = config.ZIP_MAX_FILES;
const COMPRESSION_LEVEL = config.ZIP_COMPRESSION_LEVEL;
const JOB_MAX_AGE_MS = config.ZIP_JOB_MAX_AGE_MINUTES * 60 * 1000;
const CLEANUP_DELAY_MS = 60 * 1000;
const TEMP_DIR = join(tmpdir(), "petrel-zip");

type ZipAccessContext =
    | { type: "user"; userId: number }
    | { type: "share"; share: Share; rootPath?: string };

export interface ZipJob {
    id: number;
    jobId: string;
    status: "pending" | "processing" | "completed" | "error" | "cancelled";
    progress: number;
    tempPath?: string;
    error?: string;
    fileIds?: number[];
    folderIds?: number[];
    shareToken?: string;
    userId?: number;
    totalSize: number;
    fileCount: number;
    createdAt: Date;
    completedAt?: Date;
    downloadedAt?: Date;
}

export interface CreateZipInput {
    fileIds?: number[];
    folderIds?: number[];
    shareToken?: string;
    userId?: number;
}

interface ZipEntry {
    file: File;
    entryPath: string;
}

type ContextResolution =
    | { ok: true; context: ZipAccessContext }
    | { ok: false; error: string };

type AccessCheckResult = { ok: true } | { ok: false; error: string };

async function resolveAccessContext(input: CreateZipInput): Promise<ContextResolution> {
	if (input.shareToken) {
		const shareWithSettings = await shareService.getShareByToken(input.shareToken);
		if (!shareWithSettings) {
			return { ok: false, error: "Share not found" };
		}

		const { share, settings } = shareWithSettings;
		if (!settings.allowDownload || !settings.allowZip) {
			return { ok: false, error: "ZIP downloads are disabled for this share" };
		}

		if (share.expiresAt) {
			const expiry = new Date(share.expiresAt);
			if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
				return { ok: false, error: "Share link has expired" };
			}
		}

		const content = await shareService.getShareContent(share);
		if (!content) {
			return { ok: false, error: "Invalid share target" };
		}

		if (share.type === "file" && input.folderIds && input.folderIds.length > 0) {
			return { ok: false, error: "Folders cannot be downloaded from file shares" };
		}

		const rootPath = share.type === "folder" ? normalizeRelativePath((content as Folder).path) : undefined;

		return { ok: true, context: { type: "share", share, rootPath } };
	}

	if (input.userId) {
		return { ok: true, context: { type: "user", userId: input.userId } };
	}

	return { ok: false, error: "Missing authentication context" };
}

/**
 * Validates files for ZIP creation
 */
async function validateAndCollectFiles(
	input: CreateZipInput,
	context: ZipAccessContext,
): Promise<{ valid: true; entries: ZipEntry[]; totalSize: number } | { valid: false; error: string }> {
	const entries: ZipEntry[] = [];
	const seenFileIds = new Set<number>();
	let totalSize = 0;

	const addFile = (file: File, basePath?: string) => {
		if (seenFileIds.has(file.id)) return;
		seenFileIds.add(file.id);
		totalSize += file.size;
		entries.push({
			file,
			entryPath: buildEntryPath(file, context, basePath),
		});
	};

	if (input.fileIds && input.fileIds.length > 0) {
		for (const fileId of input.fileIds) {
			const file = await fileService.getById(fileId);
			if (!file) {
				return { valid: false, error: `File ${fileId} not found` };
			}
			const access = ensureFileAccessible(file, context);
			if (!access.ok) {
				return { valid: false, error: access.error };
			}
			addFile(file);
		}
	}

	if (input.folderIds && input.folderIds.length > 0) {
		for (const folderId of input.folderIds) {
			const folder = await folderService.getById(folderId);
			if (!folder) {
				return { valid: false, error: `Folder ${folderId} not found` };
			}
			const folderAccess = ensureFolderAccessible(folder, context);
			if (!folderAccess.ok) {
				return { valid: false, error: folderAccess.error };
			}
			const folderResult = await collectFilesInFolder(
				folder,
				context,
				new Set<number>(),
				getFolderBasePath(folder.path),
				(file, base) => addFile(file, base),
			);
			if (!folderResult.success) {
				return { valid: false, error: folderResult.error };
			}
		}
	}

	if (entries.length === 0) {
		return { valid: false, error: "No files selected" };
	}

	if (entries.length > MAX_FILES) {
		return { valid: false, error: `Maximum ${MAX_FILES} files allowed per ZIP` };
	}

	if (totalSize > MAX_ZIP_SIZE) {
		return { valid: false, error: `Selected files exceed ${formatBytes(MAX_ZIP_SIZE)} limit` };
	}

	return { valid: true, entries, totalSize };
}

/**
 * Recursively collect all files in a folder and its subfolders
 */
async function collectFilesInFolder(
	folder: Folder,
	context: ZipAccessContext,
	visited: Set<number>,
	basePath: string,
	onFile: (file: File, basePath: string) => void,
): Promise<{ success: true } | { success: false; error: string }> {
	if (visited.has(folder.id)) {
		return { success: false, error: "Folder graph contains a cycle" };
	}
	visited.add(folder.id);

	const pageSize = 500;
	let offset = 0;

	while (true) {
		const { files: batch, total } = await fileService.listByPath(folder.path, pageSize, offset);
		for (const file of batch) {
			const access = ensureFileAccessible(file, context);
			if (!access.ok) {
				return { success: false, error: access.error };
			}
			onFile(file, basePath);
		}
		offset += batch.length;
		if (offset >= total || batch.length === 0) {
			break;
		}
	}

	const subfolders = await folderService.listByParentId(folder.id);
	for (const subfolder of subfolders) {
		const folderAccess = ensureFolderAccessible(subfolder, context);
		if (!folderAccess.ok) {
			return { success: false, error: folderAccess.error };
		}
		const result = await collectFilesInFolder(subfolder, context, visited, basePath, onFile);
		if (!result.success) {
			return result;
		}
	}

	return { success: true };
}

function ensureFileAccessible(file: File, context: ZipAccessContext): AccessCheckResult {
	if (context.type === "user") {
		if (file.uploadedBy !== null && file.uploadedBy !== context.userId) {
			return { ok: false, error: `File ${file.id} not accessible` };
		}
		return { ok: true };
	}

	// Share-based access
	if (context.share.type === "file") {
		return file.id === context.share.targetId
			? { ok: true }
			: { ok: false, error: `File ${file.id} not part of this share` };
	}

	const rootPath = context.rootPath;
	if (!rootPath) {
		return { ok: false, error: "Share root path unavailable" };
	}

	const filePath = normalizeRelativePath(file.path);
	if (filePath === rootPath || filePath.startsWith(`${rootPath}/`)) {
		return { ok: true };
	}

	return { ok: false, error: `File ${file.id} not accessible via this share` };
}

function ensureFolderAccessible(folder: Folder, context: ZipAccessContext): AccessCheckResult {
	if (context.type === "user") {
		if (folder.ownerId !== null && folder.ownerId !== context.userId) {
			return { ok: false, error: `Folder ${folder.id} not accessible` };
		}
		return { ok: true };
	}

	if (context.share.type === "file") {
		return { ok: false, error: "Folders cannot be downloaded from file shares" };
	}

	const rootPath = context.rootPath;
	if (!rootPath) {
		return { ok: false, error: "Share root path unavailable" };
	}

	const folderPath = normalizeRelativePath(folder.path);
	if (folderPath === rootPath || folderPath.startsWith(`${rootPath}/`)) {
		return { ok: true };
	}

	return { ok: false, error: `Folder ${folder.id} not accessible via this share` };
}

/**
 * Formats bytes to human readable string
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Creates a ZIP archive from files
 */
export async function createZipArchive(
	input: CreateZipInput,
): Promise<{ success: true; jobId: string } | { success: false; error: string }> {
	const resolved = await resolveAccessContext(input);
	if (!resolved.ok) {
		return { success: false, error: resolved.error };
	}

	const validation = await validateAndCollectFiles(input, resolved.context);
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}

	const { entries, totalSize } = validation;
	const jobId = generateJobId();

	// Create job record in database
	await db.insert(zipJobs).values({
		jobId,
		status: "pending",
		progress: 0,
		fileIds: input.fileIds ?? [],
		folderIds: input.folderIds ?? [],
		shareToken: input.shareToken,
		userId: input.userId,
		totalSize,
		fileCount: entries.length,
	});

	// Ensure temp directory exists
	mkdirSync(TEMP_DIR, { recursive: true });
	const tempPath = join(TEMP_DIR, `${jobId}.zip`);

	// Update job to processing
	await db.update(zipJobs).set({ status: "processing" }).where(eq(zipJobs.jobId, jobId));

	// Start async processing
	processZipAsync(jobId, entries, tempPath, totalSize).catch((err: Error) => {
		logger.error(`Failed to process ZIP job ${jobId}: ${err.message}`);
	});

	return { success: true, jobId };
}

/**
 * Process ZIP creation asynchronously
 */
async function processZipAsync(
	jobId: string,
	entries: ZipEntry[],
	tempPath: string,
	totalBytes: number,
): Promise<void> {
	try {
		const archiveInstance = archiver("zip", { zlib: { level: COMPRESSION_LEVEL } });
		const output = createWriteStream(tempPath);

		let processedBytes = 0;
		const safeTotalBytes = totalBytes > 0 ? totalBytes : 1;
		const isZeroByteArchive = totalBytes === 0;
		let isCompleted = false;
		let archiveError: Error | null = null;

		// Set up event handlers
		output.on("close", async () => {
			if (archiveError) return;
			isCompleted = true;
			try {
				await db
					.update(zipJobs)
					.set({
						status: "completed",
						progress: 100,
						tempPath,
						completedAt: new Date(),
					})
					.where(eq(zipJobs.jobId, jobId));

				// Schedule cleanup of old jobs
				void cleanupOldJobs();
			} catch (err) {
				logger.error(
					`Failed to update completed job ${jobId}: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		});

		archiveInstance.on("error", async (err: Error) => {
			archiveError = err;
			await updateJobError(jobId, err.message);
		});

		archiveInstance.on("progress", async (data: { fs: { processedBytes: number } }) => {
			processedBytes = data.fs.processedBytes;
			const progress = isZeroByteArchive
				? 100
				: Math.min(100, Math.round((processedBytes / safeTotalBytes) * 100));
			try {
				await db.update(zipJobs).set({ progress }).where(eq(zipJobs.jobId, jobId));
			} catch (err) {
				logger.error(
					`Failed to update progress for job ${jobId}: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		});

		archiveInstance.pipe(output);

		// Track file paths to handle duplicates
		const usedNames = new Set<string>();

		// Add files to archive
		for (const { file, entryPath } of entries) {
			// Check if job was cancelled
			const job = await getZipJob(jobId);
			if (job?.status === "cancelled") {
				archiveInstance.abort();
				throw new Error("Job cancelled");
			}

			const filePath = fileService.resolveDiskPath(file);

			// Verify file exists on disk
			const fileStat = await stat(filePath).catch(() => null);
			if (!fileStat) {
				throw new Error(`File "${file.name}" not found on disk`);
			}

			let archiveName = entryPath;
			archiveName = archiveName.replace(/^\/+/, "").replace(/\/+/g, "/");
			if (archiveName === "") {
				archiveName = file.name;
			}

			let uniqueName = archiveName;
			let duplicateCounter = 1;
			while (usedNames.has(uniqueName)) {
				duplicateCounter += 1;
				uniqueName = appendSuffix(archiveName, duplicateCounter);
			}
			usedNames.add(uniqueName);

			archiveInstance.file(filePath, { name: uniqueName });
		}

		await archiveInstance.finalize();

		// Wait a bit for the close event to fire
		await new Promise((resolve) => setTimeout(resolve, 100));

		if (archiveError) {
			throw archiveError;
		}

		if (!isCompleted) {
			// Force update to completed if event didn't fire
			await db
				.update(zipJobs)
				.set({
					status: "completed",
					progress: 100,
					tempPath,
					completedAt: new Date(),
				})
				.where(eq(zipJobs.jobId, jobId));
		}
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : "Unknown error";
		await updateJobError(jobId, errorMessage);
		logger.error(`ZIP creation failed for job ${jobId}: ${errorMessage}`);
	}
}

/**
 * Update job with error status
 */
async function updateJobError(jobId: string, error: string): Promise<void> {
	try {
		await db.update(zipJobs).set({ status: "error", error }).where(eq(zipJobs.jobId, jobId));
	} catch (err) {
		logger.error(
			`Failed to update job error for ${jobId}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

/**
 * Gets job status from database
 */
export async function getZipJob(jobId: string): Promise<ZipJob | undefined> {
	const job = await db.query.zipJobs.findFirst({
		where: eq(zipJobs.jobId, jobId),
	});

	if (!job) return undefined;

	return {
		id: job.id,
		jobId: job.jobId,
		status: job.status as ZipJob["status"],
		progress: job.progress,
		tempPath: job.tempPath ?? undefined,
		error: job.error ?? undefined,
		fileIds: job.fileIds ?? undefined,
		folderIds: job.folderIds ?? undefined,
		shareToken: job.shareToken ?? undefined,
		userId: job.userId ?? undefined,
		totalSize: job.totalSize ?? 0,
		fileCount: job.fileCount ?? 0,
		createdAt: job.createdAt,
		completedAt: job.completedAt ?? undefined,
		downloadedAt: job.downloadedAt ?? undefined,
	};
}

/**
 * Cancels a pending or processing job
 */
export async function cancelZipJob(jobId: string): Promise<boolean> {
	const job = await getZipJob(jobId);
	if (!job || (job.status !== "pending" && job.status !== "processing")) {
		return false;
	}

	await db.update(zipJobs).set({ status: "cancelled" }).where(eq(zipJobs.jobId, jobId));

	// Clean up temp file if it exists
	if (job.tempPath) {
		await cleanupTempFile(job.tempPath);
	}

	return true;
}

/**
 * Cleans up a ZIP file and removes job from database
 */
export async function cleanupZip(jobId: string): Promise<void> {
	const job = await getZipJob(jobId);
	if (!job) return;

	// Clean up temp file
	if (job.tempPath) {
		await cleanupTempFile(job.tempPath);
	}

	// Soft delete by marking as cleaned up (we keep DB record for history)
	await db
		.update(zipJobs)
		.set({ tempPath: null, downloadedAt: new Date() })
		.where(eq(zipJobs.jobId, jobId));
}

export function scheduleZipCleanup(jobId: string, delayMs = CLEANUP_DELAY_MS): void {
	setTimeout(() => {
		void cleanupZip(jobId);
	}, Math.max(delayMs, 0));
}

/**
 * Safely delete a temp file with logging
 */
async function cleanupTempFile(tempPath: string): Promise<void> {
	try {
		await unlink(tempPath);
		logger.debug(`Cleaned up temp file: ${tempPath}`);
	} catch (err) {
		// File might not exist, which is fine
		if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
			logger.error(
				`Failed to cleanup temp file: ${tempPath}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}
}

/**
 * Cleans up jobs older than configured age
 */
async function cleanupOldJobs(): Promise<void> {
	const cutoffTime = new Date(Date.now() - JOB_MAX_AGE_MS);

	try {
		// Find old jobs that still have temp files
		const oldJobs = await db.select().from(zipJobs).where(lt(zipJobs.createdAt, cutoffTime));

		for (const job of oldJobs) {
			if (job.tempPath) {
				await cleanupTempFile(job.tempPath);
				await db.update(zipJobs).set({ tempPath: null }).where(eq(zipJobs.id, job.id));
			}
		}

		logger.debug(`Cleaned up ${oldJobs.length} old ZIP jobs`);
	} catch (err) {
		logger.error(
			`Failed to cleanup old ZIP jobs: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

/**
 * Generates a unique job ID
 */
export function generateJobId(): string {
	return `zip-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function buildEntryPath(file: File, context: ZipAccessContext, basePath?: string): string {
	const safeName = normalizeFileName(file.name);
	if (context.type === "share" && context.share.type === "file") {
		return safeName;
	}
	const targetBase = basePath ?? (context.type === "share" ? context.rootPath : undefined);
	const relativePath = trimPathPrefix(file.path ?? "", targetBase);
	return relativePath ? `${relativePath}/${safeName}` : safeName;
}

function trimPathPrefix(pathValue: string, basePath?: string): string {
	const normalizedPath = normalizeRelativePath(pathValue ?? "");
	if (!basePath) {
		return normalizedPath;
	}
	const normalizedBase = normalizeRelativePath(basePath);
	if (!normalizedBase) {
		return normalizedPath;
	}
	if (normalizedPath === normalizedBase) {
		return "";
	}
	if (normalizedPath.startsWith(`${normalizedBase}/`)) {
		return normalizedPath.slice(normalizedBase.length + 1);
	}
	return normalizedPath;
}

function appendSuffix(pathValue: string, counter: number): string {
	const lastSlash = pathValue.lastIndexOf("/");
	const directory = lastSlash >= 0 ? `${pathValue.slice(0, lastSlash + 1)}` : "";
	const fileName = lastSlash >= 0 ? pathValue.slice(lastSlash + 1) : pathValue;
	const dotIndex = fileName.lastIndexOf(".");
	const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
	const extension = dotIndex > 0 ? fileName.slice(dotIndex) : "";
	const nextName = `${baseName} (${counter})${extension}`;
	return directory ? `${directory}${nextName}` : nextName;
}

function getFolderBasePath(folderPath: string): string {
	const normalized = normalizeRelativePath(folderPath ?? "");
	const lastSlash = normalized.lastIndexOf("/");
	if (lastSlash === -1) {
		return "";
	}
	return normalized.slice(0, lastSlash);
}

/**
 * Get statistics about ZIP jobs
 */
export async function getZipStats(): Promise<{
	pending: number;
	processing: number;
	completed: number;
	error: number;
}> {
	const allJobs = await db.select().from(zipJobs);

	return {
		pending: allJobs.filter((j) => j.status === "pending").length,
		processing: allJobs.filter((j) => j.status === "processing").length,
		completed: allJobs.filter((j) => j.status === "completed").length,
		error: allJobs.filter((j) => j.status === "error").length,
	};
}

export function buildZipDownloadFilename(
	requested?: string | null,
	timestamp: Date = new Date(),
): string {
	const sanitized = requested?.replace(/[^a-zA-Z0-9_\-\s.]/g, "_").trim();
	if (sanitized) {
		return sanitized.endsWith(".zip") ? sanitized : `${sanitized}.zip`;
	}
	return `petrel-download-${formatTimestamp(timestamp)}.zip`;
}

function formatTimestamp(date: Date): string {
	const pad = (value: number) => value.toString().padStart(2, "0");
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());
	return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
