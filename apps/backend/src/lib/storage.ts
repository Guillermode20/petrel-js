import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { config } from "../config";

export function getStorageRoot(): string {
	const root = config.STORAGE_PATH ?? "./storage";
	const absolute = path.resolve(root);
	return absolute;
}

export function normalizeRelativePath(inputPath: string | null | undefined): string {
	if (!inputPath) return "";

	const trimmed = inputPath.trim().replace(/\\/g, "/");
	if (!trimmed) return "";

	const normalized = path.posix.normalize(trimmed);
	if (normalized === "." || normalized === "/") return "";
	if (normalized.startsWith("..")) {
		throw new Error("Invalid path");
	}

	return normalized.replace(/^\/+/, "");
}

export function normalizeFileName(fileName: string): string {
	const baseName = path.posix.basename(fileName.trim());
	if (!baseName || baseName === "." || baseName === "..") {
		throw new Error("Invalid file name");
	}

	return baseName;
}

export function resolveStoragePath(relativePath: string): string {
	const storageRoot = path.resolve(getStorageRoot());
	const resolved = path.resolve(storageRoot, relativePath);

	if (!resolved.startsWith(storageRoot)) {
		throw new Error("Invalid path");
	}

	return resolved;
}

export function buildFileRelativePath(folderPath: string, fileName: string): string {
	const safeFolder = normalizeRelativePath(folderPath);
	const safeFileName = normalizeFileName(fileName);
	return safeFolder ? path.posix.join(safeFolder, safeFileName) : safeFileName;
}

export async function ensureDirectory(relativePath: string): Promise<void> {
	const absolutePath = resolveStoragePath(relativePath);
	await mkdir(absolutePath, { recursive: true });
}

export async function pathExists(absolutePath: string): Promise<boolean> {
	try {
		await stat(absolutePath);
		return true;
	} catch {
		return false;
	}
}

export async function moveFileOnDisk(sourcePath: string, targetPath: string): Promise<void> {
	if (sourcePath === targetPath) return;

	const sourceExists = await pathExists(sourcePath);
	if (!sourceExists) return;

	await rename(sourcePath, targetPath).catch(async () => {
		await Bun.write(targetPath, Bun.file(sourcePath));
		await unlink(sourcePath).catch(() => null);
	});
}

export async function calculateFileHash(filePath: string): Promise<string> {
	const file = Bun.file(filePath);
	const hasher = new Bun.CryptoHasher("sha256");
	const stream = file.stream();
	for await (const chunk of stream) {
		hasher.update(chunk as Uint8Array);
	}
	return hasher.digest("hex");
}

export function getChunkRelativePath(uploadId: string, chunkIndex: number): string {
	const safeUploadId = normalizeFileName(uploadId);
	const chunkFileName = chunkIndex.toString().padStart(6, "0");
	return path.posix.join(".chunks", safeUploadId, chunkFileName);
}

export function getChunkDirectoryRelativePath(uploadId: string): string {
	const safeUploadId = normalizeFileName(uploadId);
	return path.posix.join(".chunks", safeUploadId);
}

export type ThumbnailSize = "small" | "medium" | "large" | "blur";

export function getThumbnailDirectoryRelativePath(fileId: number): string {
	return path.posix.join(".thumbnails", fileId.toString());
}

export function getThumbnailRelativePath(fileId: number, size: ThumbnailSize): string {
	return path.posix.join(getThumbnailDirectoryRelativePath(fileId), `${size}.webp`);
}

export function getAudioVariantDirectoryRelativePath(fileId: number): string {
	return path.posix.join(".audio", fileId.toString());
}

export function getAudioVariantRelativePath(fileId: number, variant: "opus"): string {
	const directory = getAudioVariantDirectoryRelativePath(fileId);
	return path.posix.join(directory, `${variant}.opus`);
}
