import { and, eq, sql } from 'drizzle-orm';
import type { Album, AlbumFile, File } from '@petrel/shared';
import { db } from '../../db';
import { albumFiles, albums, files } from '../../db/schema';

export interface CreateAlbumInput {
  name: string;
  description: string | null;
  coverFileId: number | null;
  ownerId: number | null;
}

export interface UpdateAlbumInput {
  name?: string;
  description?: string | null;
  coverFileId?: number | null;
}

export interface AlbumWithFiles {
  album: Album;
  files: Array<File & { sortOrder: number }>;
}

export class AlbumService {
  private mapAlbum(row: typeof albums.$inferSelect): Album {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      coverFileId: row.coverFileId,
      ownerId: row.ownerId,
      createdAt: row.createdAt,
    };
  }

  private mapFile(row: typeof files.$inferSelect): File {
    const metadataValue = row.metadata as File['metadata'] | null | undefined;
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      size: row.size,
      mimeType: row.mimeType,
      hash: row.hash,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
      metadata: metadataValue ?? undefined,
    };
  }

  async createAlbum(input: CreateAlbumInput): Promise<Album> {
    const inserted = await db
      .insert(albums)
      .values({
        name: input.name,
        description: input.description,
        coverFileId: input.coverFileId,
        ownerId: input.ownerId,
      })
      .returning();

    const created = inserted[0];
    if (!created) {
      throw new Error('Failed to create album');
    }

    return this.mapAlbum(created);
  }

  async getAlbumById(id: number): Promise<Album | null> {
    const album = await db.query.albums.findFirst({ where: eq(albums.id, id) });
    return album ? this.mapAlbum(album) : null;
  }

  async getAlbumWithFiles(id: number): Promise<AlbumWithFiles | null> {
    const album = await this.getAlbumById(id);
    if (!album) return null;

    const rows = await db
      .select({ file: files, albumFile: albumFiles })
      .from(albumFiles)
      .innerJoin(files, eq(albumFiles.fileId, files.id))
      .where(eq(albumFiles.albumId, id))
      .orderBy(albumFiles.sortOrder);

    return {
      album,
      files: rows.map((row) => ({
        ...this.mapFile(row.file),
        sortOrder: row.albumFile.sortOrder,
      })),
    };
  }

  async updateAlbum(id: number, input: UpdateAlbumInput): Promise<Album | null> {
    const existing = await this.getAlbumById(id);
    if (!existing) return null;

    const updated = await db
      .update(albums)
      .set({
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        coverFileId: input.coverFileId ?? existing.coverFileId,
      })
      .where(eq(albums.id, id))
      .returning();

    const updatedRow = updated[0];
    return updatedRow ? this.mapAlbum(updatedRow) : null;
  }

  async addFilesToAlbum(albumId: number, fileIds: number[]): Promise<AlbumFile[]> {
    if (fileIds.length === 0) return [];

    const [{ maxOrder } = { maxOrder: 0 }] = await db
      .select({ maxOrder: sql<number>`max(${albumFiles.sortOrder})` })
      .from(albumFiles)
      .where(eq(albumFiles.albumId, albumId));

    let nextOrder = maxOrder ?? 0;
    const rows = fileIds.map((fileId) => {
      nextOrder += 1;
      return { albumId, fileId, sortOrder: nextOrder };
    });

    const inserted = await db.insert(albumFiles).values(rows).returning();
    return inserted.map((row) => ({
      albumId: row.albumId,
      fileId: row.fileId,
      sortOrder: row.sortOrder,
    }));
  }

  async removeFileFromAlbum(albumId: number, fileId: number): Promise<void> {
    await db
      .delete(albumFiles)
      .where(and(eq(albumFiles.albumId, albumId), eq(albumFiles.fileId, fileId)));
  }

  async reorderFiles(albumId: number, updates: Array<{ fileId: number; sortOrder: number }>): Promise<void> {
    for (const update of updates) {
      await db
        .update(albumFiles)
        .set({ sortOrder: update.sortOrder })
        .where(and(eq(albumFiles.albumId, albumId), eq(albumFiles.fileId, update.fileId)));
    }
  }
}

export const albumService = new AlbumService();