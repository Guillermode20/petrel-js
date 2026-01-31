import { Elysia, t } from 'elysia';
import type { BunFile } from 'bun';
import sharp from 'sharp';
import { rename, unlink, readdir, rm, stat } from 'node:fs/promises';
import type { File as SharedFile } from '@petrel/shared';
import { config } from '../../config';
import { logger } from '../../lib/logger';
import { uploadRateLimit } from '../../lib/rate-limit';
import { authMiddleware, requireAuth } from '../auth';
import { fileService } from '../../services/file.service';
import { folderService } from '../../services/folder.service';
import { metadataService } from '../../services/metadata.service';
import { videoService } from '../../services/video.service';
import {
  generateVideoThumbnail,
  generateVideoSprite,
  getVideoThumbnailPath,
  getSpritePath,
  getSpriteMetaPath,
  type SpriteMetadata,
} from '../../lib/thumbnails';
import {
  generateWaveformData,
  generateWaveformImage,
  type WaveformData,
} from '../../lib/waveform';
import {
  buildFileRelativePath,
  ensureDirectory,
  getChunkDirectoryRelativePath,
  getChunkRelativePath,
  getThumbnailDirectoryRelativePath,
  getThumbnailRelativePath,
  type ThumbnailSize,
  normalizeFileName,
  normalizeRelativePath,
  resolveStoragePath,
} from '../../lib/storage';
import type { ApiResponse, FileListData } from './types';

const GUEST_ACCESS_ENABLED = config.PETREL_GUEST_ACCESS;

function canRead(user: unknown): boolean {
  return Boolean(user) || GUEST_ACCESS_ENABLED;
}

function getPagination(query: { limit?: number; offset?: number }): { limit: number; offset: number } {
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);
  return { limit, offset };
}

function isValidChunkIndex(chunkIndex: number, totalChunks: number): boolean {
  return chunkIndex >= 0 && chunkIndex < totalChunks;
}

function parseThumbnailSize(input: string | undefined): ThumbnailSize {
  if (input === 'small' || input === 'large' || input === 'blur') return input;
  return 'medium';
}

function getThumbnailSizePx(size: ThumbnailSize): number {
  if (size === 'small') return 256;
  if (size === 'blur') return 32;
  if (size === 'large') return 1024;
  return 512;
}

function normalizePathSafe(value: string | undefined, set: { status?: number | string }): string | null {
  try {
    return normalizeRelativePath(value ?? '');
  } catch {
    set.status = 400;
    return null;
  }
}

function normalizeNameSafe(value: string, set: { status?: number | string }): string | null {
  try {
    return normalizeFileName(value);
  } catch {
    set.status = 400;
    return null;
  }
}

function parseNumberField(
  value: number | string,
  set: { status?: number | string },
  field: string
): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    set.status = 400;
    return null;
  }
  return parsed;
}

async function resolveFolderPathById(
  folderId: number | null,
  set: { status?: number | string }
): Promise<string | null> {
  if (folderId === null) return '';
  const folder = await folderService.getById(folderId);
  if (!folder) {
    set.status = 404;
    return null;
  }
  return folder.path;
}

async function calculateFileHash(filePath: string): Promise<string> {
  const fileBuffer = await Bun.file(filePath).arrayBuffer();
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(new Uint8Array(fileBuffer));
  return hasher.digest('hex');
}

async function writeChunkToDisk(chunk: Blob, uploadId: string, chunkIndex: number): Promise<void> {
  const chunkDir = getChunkDirectoryRelativePath(uploadId);
  await ensureDirectory(chunkDir);

  const chunkPath = resolveStoragePath(getChunkRelativePath(uploadId, chunkIndex));
  await Bun.write(chunkPath, chunk);
}

async function areAllChunksPresent(uploadId: string, totalChunks: number): Promise<boolean> {
  const chunkDir = resolveStoragePath(getChunkDirectoryRelativePath(uploadId));
  const files = await readdir(chunkDir).catch(() => []);
  return files.length >= totalChunks;
}

type BunFileWriter = ReturnType<BunFile['writer']>;

async function appendFileToWriter(writer: BunFileWriter, chunkPath: string): Promise<void> {
  const stream = Bun.file(chunkPath).stream();
  for await (const data of stream) {
    await writer.write(data as Uint8Array);
  }
}

async function assembleChunks(uploadId: string, totalChunks: number, finalPath: string): Promise<void> {
  const chunkDir = resolveStoragePath(getChunkDirectoryRelativePath(uploadId));
  const writer = Bun.file(finalPath).writer();

  for (let index = 0; index < totalChunks; index += 1) {
    const chunkFileName = index.toString().padStart(6, '0');
    const chunkPath = resolveStoragePath(`${getChunkDirectoryRelativePath(uploadId)}/${chunkFileName}`);
    await appendFileToWriter(writer, chunkPath);
  }

  await writer.end();
  await rm(chunkDir, { recursive: true, force: true });
}

async function moveFileOnDisk(sourcePath: string, targetPath: string): Promise<void> {
  if (sourcePath === targetPath) return;

  const sourceExists = await stat(sourcePath).then(() => true).catch(() => false);
  if (!sourceExists) return;

  await rename(sourcePath, targetPath).catch(async () => {
    await Bun.write(targetPath, Bun.file(sourcePath));
    await unlink(sourcePath).catch(() => null);
  });
}

async function finalizeUpload(params: {
  uploadId: string;
  totalChunks: number;
  folderPath: string;
  fileName: string;
  mimeType: string;
  userId: number;
}): Promise<SharedFile> {
  const finalRelativePath = buildFileRelativePath(params.folderPath, params.fileName);
  const finalPath = resolveStoragePath(finalRelativePath);
  await ensureDirectory(params.folderPath);
  await assembleChunks(params.uploadId, params.totalChunks, finalPath);

  const fileHash = await calculateFileHash(finalPath);
  const size = Bun.file(finalPath).size;

  const folder = await folderService.getFolderByPath(params.folderPath);
  const parentId = folder?.id ?? null;

  const created = await fileService.createFile({
    name: params.fileName,
    path: params.folderPath,
    size,
    mimeType: params.mimeType,
    hash: fileHash,
    uploadedBy: params.userId,
    parentId,
    metadata: null,
  });

  const updated = await enrichMetadata(created);
  return updated ?? created;
}

async function enrichMetadata(file: SharedFile): Promise<SharedFile | null> {
  if (file.mimeType.startsWith('audio/')) {
    const metadata = await metadataService.extractAudioMetadata(fileService.resolveDiskPath(file));
    return await fileService.updateMetadata(file.id, metadata);
  }

  if (file.mimeType.startsWith('image/')) {
    const metadata = await metadataService.extractImageMetadata(fileService.resolveDiskPath(file));
    return await fileService.updateMetadata(file.id, metadata);
  }

  if (file.mimeType.startsWith('video/')) {
    try {
      const filePath = fileService.resolveDiskPath(file);
      const metadata = await videoService.processVideoFile(file.id, filePath);
      return await fileService.updateMetadata(file.id, metadata);
    } catch {
      // Video processing may fail for unsupported formats
      return null;
    }
  }

  return null;
}

async function ensureThumbnail(file: SharedFile, size: ThumbnailSize): Promise<string> {
  const thumbnailRelative = getThumbnailRelativePath(file.id, size);
  const thumbnailPath = resolveStoragePath(thumbnailRelative);
  const thumbnailStat = await stat(thumbnailPath).catch(() => null);

  if (!thumbnailStat) {
    const filePath = fileService.resolveDiskPath(file);
    await ensureDirectory(getThumbnailDirectoryRelativePath(file.id));
    const pipeline = sharp(filePath).resize({
      width: getThumbnailSizePx(size),
      height: getThumbnailSizePx(size),
      fit: 'inside',
    });

    if (size === 'blur') {
      pipeline.blur(8);
    }

    await pipeline.toFormat('webp').toFile(thumbnailPath);
  }

  return thumbnailPath;
}

async function handleChunkUpload(
  body: {
    uploadId: string;
    chunkIndex: number;
    totalChunks: number;
    fileName: string;
    path?: string;
    mimeType?: string;
    chunk: Blob;
  },
  userId: number,
  set: { status?: number }
): Promise<ApiResponse<SharedFile>> {
  if (!isValidChunkIndex(body.chunkIndex, body.totalChunks)) {
    set.status = 400;
    return { data: null, error: 'Invalid chunk index' };
  }

  const folderPath = normalizePathSafe(body.path, set);
  if (folderPath === null) {
    return { data: null, error: 'Invalid path' };
  }

  const safeFileName = normalizeNameSafe(body.fileName, set);
  if (!safeFileName) {
    return { data: null, error: 'Invalid file name' };
  }
  const existing = await fileService.findByPathAndName(folderPath, safeFileName);

  if (existing) {
    set.status = 409;
    return { data: null, error: 'File already exists' };
  }

  await writeChunkToDisk(body.chunk, body.uploadId, body.chunkIndex);
  const allChunksPresent = await areAllChunksPresent(body.uploadId, body.totalChunks);

  if (!allChunksPresent) {
    set.status = 202;
    return { data: null, error: null };
  }

  const created = await finalizeUpload({
    uploadId: body.uploadId,
    totalChunks: body.totalChunks,
    folderPath,
    fileName: safeFileName,
    mimeType: body.mimeType ?? 'application/octet-stream',
    userId,
  });

  return { data: created, error: null };
}

export const fileRoutes = new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  .get(
    '/files',
    async ({ query, set, user }): Promise<ApiResponse<FileListData>> => {
      if (!canRead(user)) {
        set.status = 401;
        return { data: null, error: 'Unauthorized' };
      }

      let folderPath: string | null = null;
      if (query.folderId !== undefined) {
        const folderId = parseNumberField(query.folderId, set, 'folderId');
        if (folderId === null) {
          return { data: null, error: 'Invalid folder id' };
        }
        folderPath = await resolveFolderPathById(folderId, set);
        if (folderPath === null) {
          return { data: null, error: 'Folder not found' };
        }
      } else {
        folderPath = normalizePathSafe(query.path, set);
      }
      if (folderPath === null) {
        return { data: null, error: 'Invalid path' };
      }
      const { limit, offset } = getPagination({
        limit: query.limit,
        offset: query.offset,
      });

      const [fileResult, parentFolder] = await Promise.all([
        fileService.listByPath(folderPath, limit, offset),
        folderPath ? folderService.getFolderByPath(folderPath) : Promise.resolve(null),
      ]);

      const [folders, parentChain] = await Promise.all([
        parentFolder
          ? folderService.listByParentId(parentFolder.id)
          : folderPath
            ? Promise.resolve([])
            : folderService.listByParentId(null),
        folderService.getParentChain(parentFolder?.id ?? null),
      ]);

      return {
        data: {
          files: fileResult.files,
          folders,
          currentFolder: parentFolder,
          parentChain,
          pagination: {
            limit,
            offset,
            total: fileResult.total,
          },
        },
        error: null,
      };
    },
    {
      query: t.Object({
        path: t.Optional(t.String()),
        folderId: t.Optional(t.Union([t.Number(), t.String()])),
        limit: t.Optional(t.Number()),
        offset: t.Optional(t.Number()),
      }),
      detail: {
        summary: 'List files and folders',
        description: 'Returns files and folders within a path with pagination',
        tags: ['Files'],
      },
    }
  )
  .get(
    '/files/:id',
    async ({ params, set, user }): Promise<ApiResponse<SharedFile>> => {
      if (!canRead(user)) {
        set.status = 401;
        return { data: null, error: 'Unauthorized' };
      }

      const file = await fileService.getById(params.id);
      if (!file) {
        set.status = 404;
        return { data: null, error: 'File not found' };
      }

      return { data: file, error: null };
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        summary: 'Get file metadata',
        description: 'Returns metadata for a single file',
        tags: ['Files'],
      },
    }
  )
  .get(
    '/files/:id/download',
    async ({ params, set, user }) => {
      if (!canRead(user)) {
        set.status = 401;
        return { data: null, error: 'Unauthorized' };
      }

      const file = await fileService.getById(params.id);
      if (!file) {
        set.status = 404;
        return { data: null, error: 'File not found' };
      }

      const filePath = fileService.resolveDiskPath(file);
      const fileStat = await stat(filePath).catch(() => null);

      if (!fileStat) {
        set.status = 404;
        return { data: null, error: 'File not found on disk' };
      }

      set.headers['Content-Type'] = file.mimeType;
      set.headers['Content-Length'] = fileStat.size.toString();
      set.headers['Content-Disposition'] = `attachment; filename="${file.name}"`;

      return new Response(Bun.file(filePath));
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        summary: 'Download file',
        description: 'Streams a file download by id',
        tags: ['Files'],
      },
    }
  )
  .get(
    '/files/:id/thumbnail',
    async ({ params, query, set, user }) => {
      if (!canRead(user)) {
        set.status = 401;
        return { data: null, error: 'Unauthorized' };
      }

      const file = await fileService.getById(params.id);
      if (!file) {
        set.status = 404;
        return { data: null, error: 'File not found' };
      }

      const size = parseThumbnailSize(query.size);

      if (file.mimeType.startsWith('image/')) {
        const thumbnailPath = await ensureThumbnail(file, size);
        set.headers['Content-Type'] = 'image/webp';
        set.headers['Cache-Control'] = 'max-age=31536000';
        return new Response(Bun.file(thumbnailPath));
      }

      if (file.mimeType.startsWith('video/')) {
        const metadata = file.metadata as { duration?: number } | undefined;
        const duration = metadata?.duration ?? 60;
        const filePath = fileService.resolveDiskPath(file);
        const thumbnailPath = await generateVideoThumbnail(filePath, file.id, size, duration);
        set.headers['Content-Type'] = 'image/webp';
        set.headers['Cache-Control'] = 'max-age=31536000';
        return new Response(Bun.file(thumbnailPath));
      }

      set.status = 400;
      return { data: null, error: 'Thumbnail available for images and videos only' };
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      query: t.Object({
        size: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Get file thumbnail',
        description: 'Returns a cached thumbnail for image and video files',
        tags: ['Files'],
      },
    }
  )
  .get(
    '/files/:id/sprite',
    async ({ params, set, user }) => {
      if (!canRead(user)) {
        set.status = 401;
        return { data: null, error: 'Unauthorized' };
      }

      const file = await fileService.getById(params.id);
      if (!file) {
        set.status = 404;
        return { data: null, error: 'File not found' };
      }

      if (!file.mimeType.startsWith('video/')) {
        set.status = 400;
        return { data: null, error: 'Sprite available for videos only' };
      }

      const metadata = file.metadata as { duration?: number } | undefined;
      const duration = metadata?.duration ?? 60;
      const filePath = fileService.resolveDiskPath(file);
      const { spritePath } = await generateVideoSprite(filePath, file.id, duration);

      set.headers['Content-Type'] = 'image/webp';
      set.headers['Cache-Control'] = 'max-age=31536000';
      return new Response(Bun.file(spritePath));
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        summary: 'Get video sprite sheet',
        description: 'Returns a sprite sheet for video scrubbing preview',
        tags: ['Files'],
      },
    }
  )
  .get(
    '/files/:id/sprite/meta',
    async ({ params, set, user }): Promise<{ data: SpriteMetadata | null; error: string | null }> => {
      if (!canRead(user)) {
        set.status = 401;
        return { data: null, error: 'Unauthorized' };
      }

      const file = await fileService.getById(params.id);
      if (!file) {
        set.status = 404;
        return { data: null, error: 'File not found' };
      }

      if (!file.mimeType.startsWith('video/')) {
        set.status = 400;
        return { data: null, error: 'Sprite available for videos only' };
      }

      const metadata = file.metadata as { duration?: number } | undefined;
      const duration = metadata?.duration ?? 60;
      const filePath = fileService.resolveDiskPath(file);
      const { metadata: spriteMeta } = await generateVideoSprite(filePath, file.id, duration);

      return { data: spriteMeta, error: null };
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        summary: 'Get video sprite metadata',
        description: 'Returns metadata for the sprite sheet (dimensions, interval)',
        tags: ['Files'],
      },
    }
  )
  .get(
    '/files/:id/waveform',
    async ({ params, set, user }): Promise<{ data: WaveformData | null; error: string | null }> => {
      if (!canRead(user)) {
        set.status = 401;
        return { data: null, error: 'Unauthorized' };
      }

      const file = await fileService.getById(params.id);
      if (!file) {
        set.status = 404;
        return { data: null, error: 'File not found' };
      }

      if (!file.mimeType.startsWith('audio/')) {
        set.status = 400;
        return { data: null, error: 'Waveform available for audio files only' };
      }

      const filePath = fileService.resolveDiskPath(file);
      const waveformData = await generateWaveformData(filePath, file.id);

      return { data: waveformData, error: null };
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      detail: {
        summary: 'Get audio waveform data',
        description: 'Returns waveform sample data for audio visualization',
        tags: ['Files'],
      },
    }
  )
  .get(
    '/files/:id/waveform/image',
    async ({ params, query, set, user }) => {
      if (!canRead(user)) {
        set.status = 401;
        return { data: null, error: 'Unauthorized' };
      }

      const file = await fileService.getById(params.id);
      if (!file) {
        set.status = 404;
        return { data: null, error: 'File not found' };
      }

      if (!file.mimeType.startsWith('audio/')) {
        set.status = 400;
        return { data: null, error: 'Waveform available for audio files only' };
      }

      const width = Math.min(Math.max(query.width ?? 800, 100), 2000);
      const height = Math.min(Math.max(query.height ?? 100, 50), 500);

      const filePath = fileService.resolveDiskPath(file);
      const imagePath = await generateWaveformImage(filePath, file.id, width, height);

      set.headers['Content-Type'] = 'image/png';
      set.headers['Cache-Control'] = 'max-age=31536000';
      return new Response(Bun.file(imagePath));
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      query: t.Object({
        width: t.Optional(t.Number()),
        height: t.Optional(t.Number()),
      }),
      detail: {
        summary: 'Get audio waveform image',
        description: 'Returns a rendered waveform image for audio files',
        tags: ['Files'],
      },
    }
  )
  .group('/files', (app) =>
    app
      .use(requireAuth)
      .use(uploadRateLimit)
      .post(
        '/upload',
        async ({ body, set, user }): Promise<ApiResponse<SharedFile>> => {
          const chunkIndex = parseNumberField(body.chunkIndex, set, 'chunkIndex');
          if (chunkIndex === null) {
            return { data: null, error: 'Invalid chunk index' };
          }

          const totalChunks = parseNumberField(body.totalChunks, set, 'totalChunks');
          if (totalChunks === null) {
            return { data: null, error: 'Invalid total chunks' };
          }

          let folderPath: string | undefined;
          if (body.folderId !== undefined) {
            const folderId = parseNumberField(body.folderId, set, 'folderId');
            if (folderId === null) {
              return { data: null, error: 'Invalid folder id' };
            }
            const resolvedPath = await resolveFolderPathById(folderId, set);
            if (resolvedPath === null) {
              return { data: null, error: 'Folder not found' };
            }
            folderPath = resolvedPath;
          }

          return await handleChunkUpload(
            {
              uploadId: body.uploadId,
              chunkIndex,
              totalChunks,
              fileName: body.fileName,
              path: folderPath ?? body.path,
              mimeType: body.mimeType,
              chunk: body.chunk,
            },
            user.userId,
            set
          );
        },
        {
          body: t.Object({
            uploadId: t.String({ minLength: 1 }),
            chunkIndex: t.Union([t.Number({ minimum: 0 }), t.String()]),
            totalChunks: t.Union([t.Number({ minimum: 1 }), t.String()]),
            fileName: t.String({ minLength: 1 }),
            path: t.Optional(t.String()),
            folderId: t.Optional(t.Union([t.Number(), t.String()])),
            mimeType: t.Optional(t.String()),
            size: t.Optional(t.Union([t.Number(), t.String()])),
            chunk: t.File(),
          }),
          detail: {
            summary: 'Upload a file chunk',
            description: 'Accepts chunked uploads and assembles when complete',
            tags: ['Files'],
          },
        }
      )
      .delete(
        '/:id',
        async ({ params, set }): Promise<ApiResponse<{ id: number }>> => {
          const file = await fileService.getById(params.id);
          if (!file) {
            set.status = 404;
            return { data: null, error: 'File not found' };
          }

          const diskPath = fileService.resolveDiskPath(file);
          await unlink(diskPath).catch(() => null);
          await fileService.deleteFile(params.id);

          return { data: { id: params.id }, error: null };
        },
        {
          params: t.Object({
            id: t.Number(),
          }),
          detail: {
            summary: 'Delete a file',
            description: 'Deletes a file from disk and database',
            tags: ['Files'],
          },
        }
      )
      .patch(
        '/:id',
        async ({ params, body, set }): Promise<ApiResponse<SharedFile>> => {
          const file = await fileService.getById(params.id);
          if (!file) {
            set.status = 404;
            return { data: null, error: 'File not found' };
          }

          const nextName = body.name ? normalizeNameSafe(body.name, set) : file.name;
          if (!nextName) {
            return { data: null, error: 'Invalid file name' };
          }

          let nextPath: string | null = file.path;
          if (body.folderId !== undefined) {
            if (body.folderId === null || body.folderId === 'null' || body.folderId === '') {
              nextPath = '';
            } else {
              const folderId = parseNumberField(body.folderId, set, 'folderId');
              if (folderId === null) {
                return { data: null, error: 'Invalid folder id' };
              }
              nextPath = await resolveFolderPathById(folderId, set);
            }
          } else if (body.path) {
            nextPath = normalizePathSafe(body.path, set);
          }
          if (nextPath === null) {
            return { data: null, error: 'Invalid path' };
          }
          const updated = await fileService.updateFile(params.id, {
            name: nextName,
            path: nextPath,
          });

          if (!updated) {
            set.status = 500;
            return { data: null, error: 'Failed to update file' };
          }

          const currentDiskPath = fileService.resolveDiskPath(file);
          const nextDiskPath = resolveStoragePath(buildFileRelativePath(nextPath, nextName));
          await ensureDirectory(nextPath);
          await moveFileOnDisk(currentDiskPath, nextDiskPath);

          return { data: updated, error: null };
        },
        {
          params: t.Object({
            id: t.Number(),
          }),
          body: t.Object({
            name: t.Optional(t.String()),
            path: t.Optional(t.String()),
            folderId: t.Optional(t.Union([t.Number(), t.String(), t.Null()])),
          }),
          detail: {
            summary: 'Rename or move a file',
            description: 'Updates file name or path and moves on disk',
            tags: ['Files'],
          },
        }
      )
      .put(
        '/:id/content',
        async ({ params, body, set }): Promise<ApiResponse<SharedFile>> => {
          const file = await fileService.getById(params.id);
          if (!file) {
            set.status = 404;
            return { data: null, error: 'File not found' };
          }

          const TEXT_MIME_TYPES = [
            'text/plain',
            'text/markdown',
            'text/html',
            'text/css',
            'text/javascript',
            'application/json',
            'application/javascript',
            'application/xml',
            'text/xml',
            'text/x-python',
            'text/x-java',
            'text/x-c',
            'text/x-c++',
            'text/x-csharp',
            'text/x-ruby',
            'text/x-php',
            'text/x-go',
            'text/x-rust',
            'text/x-typescript',
            'text/x-shellscript',
            'text/yaml',
            'text/x-yaml',
            'application/x-yaml',
            'text/x-toml',
            'application/x-toml',
            'text/x-ini',
            'text/csv',
            'application/sql',
            'text/x-sql',
            'application/x-sh',
            'text/x-script.python',
            'text/x-script.perl',
            'text/x-script.php',
          ];

          if (!TEXT_MIME_TYPES.includes(file.mimeType)) {
            set.status = 400;
            return { data: null, error: 'Cannot edit non-text files' };
          }

          const updated = await fileService.updateFileContent(params.id, body.content);
          if (!updated) {
            set.status = 500;
            return { data: null, error: 'Failed to update file content' };
          }

          return { data: updated, error: null };
        },
        {
          params: t.Object({
            id: t.Number(),
          }),
          body: t.Object({
            content: t.String({ minLength: 1, maxLength: 10_000_000 }),
          }),
          detail: {
            summary: 'Update file content',
            description: 'Updates the content of a text file',
            tags: ['Files'],
          },
        }
      )
  )
  .group('', (app) =>
    app
      .use(requireAuth)
      .post(
        '/folders',
        async ({ body, set, user }): Promise<ApiResponse<{ id: number }>> => {
          let normalizedParent: string | null = null;
          if (body.parentId !== undefined) {
            const parentId = parseNumberField(body.parentId, set, 'parentId');
            if (parentId === null) {
              return { data: null, error: 'Invalid parent id' };
            }
            const resolvedParent = await resolveFolderPathById(parentId, set);
            if (resolvedParent === null) {
              return { data: null, error: 'Parent folder not found' };
            }
            normalizedParent = resolvedParent;
          } else if (body.parentPath) {
            normalizedParent = normalizePathSafe(body.parentPath, set);
            if (normalizedParent === null) {
              return { data: null, error: 'Invalid path' };
            }
          }

          const folderName = normalizeNameSafe(body.name, set);
          if (!folderName) {
            return { data: null, error: 'Invalid folder name' };
          }

          const created = await folderService.createFolder({
            name: folderName,
            parentPath: normalizedParent,
            ownerId: user.userId,
          });

          const folderPath = created.path;
          await ensureDirectory(folderPath);

          return { data: { id: created.id }, error: null };
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            parentPath: t.Optional(t.String()),
            parentId: t.Optional(t.Union([t.Number(), t.String()])),
          }),
          detail: {
            summary: 'Create folder',
            description: 'Creates a folder and storage path',
            tags: ['Folders'],
          },
        }
      )
      .patch(
        '/folders/:id',
        async ({ params, body, set }): Promise<ApiResponse<{ id: number }>> => {
          const folder = await folderService.getById(params.id);
          if (!folder) {
            set.status = 404;
            return { data: null, error: 'Folder not found' };
          }
          let nextParentId = folder.parentId;
          if (body.parentId !== undefined) {
             if (body.parentId === null || body.parentId === 'null' || body.parentId === '') {
               nextParentId = null;
             } else {
               const parsedId = parseNumberField(body.parentId, set, 'parentId');
               if (parsedId === null) return { data: null, error: 'Invalid parent' };
               nextParentId = parsedId;
             }
          }
          const nextName = body.name ? normalizeNameSafe(body.name, set) : folder.name;
          if (!nextName) return { data: null, error: 'Invalid name' };
          const updated = await folderService.updateFolder(params.id, {
            name: nextName,
            parentId: nextParentId,
          });
          if (!updated) {
            set.status = 500;
            return { data: null, error: 'Failed' };
          }
          if (updated.path !== folder.path) {
            const currentDiskPath = resolveStoragePath(folder.path);
            const nextDiskPath = resolveStoragePath(updated.path);
            const pathParts = updated.path.split('/');
            if (pathParts.length > 1) {
              const relativeParentDir = pathParts.slice(0, -1).join('/');
              await ensureDirectory(relativeParentDir);
            }
            await moveFileOnDisk(currentDiskPath, nextDiskPath);
          }
          return { data: { id: updated.id }, error: null };
        },
        {
          params: t.Object({ id: t.Number() }),
          body: t.Object({
            name: t.Optional(t.String()),
            parentId: t.Optional(t.Union([t.Number(), t.String(), t.Null()])),
          }),
        }
      )
  );