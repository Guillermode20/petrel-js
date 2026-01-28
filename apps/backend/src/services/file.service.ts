import { and, eq, sql } from 'drizzle-orm';
import type { File } from '@petrel/shared';
import { db } from '../../db';
import { files } from '../../db/schema';
import { buildFileRelativePath, normalizeRelativePath, resolveStoragePath } from '../lib/storage';

export interface FileListResult {
  files: File[];
  total: number;
}

export interface CreateFileInput {
  name: string;
  path: string;
  size: number;
  mimeType: string;
  hash: string;
  uploadedBy: number | null;
  metadata: File['metadata'] | null;
}

export interface UpdateFileInput {
  name?: string;
  path?: string;
}

export class FileService {
  private mapFileRow(row: typeof files.$inferSelect): File {
    let metadataValue = row.metadata as File['metadata'] | string | null | undefined;
    if (typeof metadataValue === 'string') {
      try {
        metadataValue = JSON.parse(metadataValue) as File['metadata'];
      } catch {
        metadataValue = null;
      }
    }
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

  async listByPath(folderPath: string, limit: number, offset: number): Promise<FileListResult> {
    const normalizedPath = normalizeRelativePath(folderPath);

    const fileRows = await db.query.files.findMany({
      where: eq(files.path, normalizedPath),
      limit,
      offset,
    });

    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(eq(files.path, normalizedPath));

    return {
      files: fileRows.map((row) => this.mapFileRow(row)),
      total: countRows[0]?.count ?? 0,
    };
  }

  async getById(id: number): Promise<File | null> {
    const file = await db.query.files.findFirst({
      where: eq(files.id, id),
    });

    return file ? this.mapFileRow(file) : null;
  }

  async findByPathAndName(folderPath: string, name: string): Promise<File | null> {
    const normalizedPath = normalizeRelativePath(folderPath);
    const file = await db.query.files.findFirst({
      where: and(eq(files.path, normalizedPath), eq(files.name, name)),
    });

    return file ? this.mapFileRow(file) : null;
  }

  async createFile(input: CreateFileInput): Promise<File> {
    const normalizedPath = normalizeRelativePath(input.path);
    const inserted = await db
      .insert(files)
      .values({
        name: input.name,
        path: normalizedPath,
        size: input.size,
        mimeType: input.mimeType,
        hash: input.hash,
        uploadedBy: input.uploadedBy,
        metadata: input.metadata,
      })
      .returning();

    const created = inserted[0];
    if (!created) {
      throw new Error('Failed to create file record');
    }

    return this.mapFileRow(created);
  }

  async updateFile(id: number, input: UpdateFileInput): Promise<File | null> {
    const current = await this.getById(id);
    if (!current) return null;

    const nextPath = input.path ? normalizeRelativePath(input.path) : current.path;
    const nextName = input.name ?? current.name;

    const updated = await db
      .update(files)
      .set({
        path: nextPath,
        name: nextName,
      })
      .where(eq(files.id, id))
      .returning();

    const updatedRow = updated[0];
    return updatedRow ? this.mapFileRow(updatedRow) : null;
  }

  async deleteFile(id: number): Promise<File | null> {
    const current = await this.getById(id);
    if (!current) return null;

    await db.delete(files).where(eq(files.id, id));
    return current;
  }

  async updateMetadata(id: number, metadata: File['metadata'] | null): Promise<File | null> {
    if (!metadata) return await this.getById(id);

    const updated = await db
      .update(files)
      .set({ metadata })
      .where(eq(files.id, id))
      .returning();

    const updatedRow = updated[0];
    return updatedRow ? this.mapFileRow(updatedRow) : null;
  }

  resolveDiskPath(file: File): string {
    const relativePath = buildFileRelativePath(file.path, file.name);
    return resolveStoragePath(relativePath);
  }
}

export const fileService = new FileService();