import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { config } from '../config';

export function getStorageRoot(): string {
  const root = config.STORAGE_PATH ?? './storage';
  const absolute = path.resolve(root);
  return absolute;
}

export function normalizeRelativePath(inputPath: string | null | undefined): string {
  if (!inputPath) return '';

  const trimmed = inputPath.trim().replace(/\\/g, '/');
  if (!trimmed) return '';

  const normalized = path.posix.normalize(trimmed);
  if (normalized === '.' || normalized === '/') return '';
  if (normalized.startsWith('..')) {
    throw new Error('Invalid path');
  }

  return normalized.replace(/^\/+/, '');
}

export function normalizeFileName(fileName: string): string {
  const baseName = path.posix.basename(fileName.trim());
  if (!baseName || baseName === '.' || baseName === '..') {
    throw new Error('Invalid file name');
  }

  return baseName;
}

export function resolveStoragePath(relativePath: string): string {
  const storageRoot = path.resolve(getStorageRoot());
  const resolved = path.resolve(storageRoot, relativePath);

  if (!resolved.startsWith(storageRoot)) {
    throw new Error('Invalid path');
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

export function getChunkRelativePath(uploadId: string, chunkIndex: number): string {
  const safeUploadId = normalizeFileName(uploadId);
  const chunkFileName = chunkIndex.toString().padStart(6, '0');
  return path.posix.join('.chunks', safeUploadId, chunkFileName);
}

export function getChunkDirectoryRelativePath(uploadId: string): string {
  const safeUploadId = normalizeFileName(uploadId);
  return path.posix.join('.chunks', safeUploadId);
}

export type ThumbnailSize = 'small' | 'medium' | 'large' | 'blur';

export function getThumbnailDirectoryRelativePath(fileId: number): string {
  return path.posix.join('.thumbnails', fileId.toString());
}

export function getThumbnailRelativePath(fileId: number, size: ThumbnailSize): string {
  return path.posix.join(getThumbnailDirectoryRelativePath(fileId), `${size}.webp`);
}