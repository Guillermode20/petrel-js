import { eq, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { folders } from '../../db/schema';
import type { Folder } from '@petrel/shared';
import { normalizeRelativePath } from '../lib/storage';

export interface CreateFolderInput {
  name: string;
  parentPath: string | null;
  ownerId: number | null;
}

export class FolderService {
  async getFolderByPath(path: string): Promise<Folder | null> {
    const normalizedPath = normalizeRelativePath(path);
    const folder = await db.query.folders.findFirst({
      where: eq(folders.path, normalizedPath),
    });

    return folder ?? null;
  }

  async listByParentId(parentId: number | null): Promise<Folder[]> {
    if (parentId === null) {
      return await db.query.folders.findMany({
        where: isNull(folders.parentId),
      });
    }

    return await db.query.folders.findMany({
      where: eq(folders.parentId, parentId),
    });
  }

  async createFolder(input: CreateFolderInput): Promise<Folder> {
    const parentPath = input.parentPath ? normalizeRelativePath(input.parentPath) : '';
    const folderPath = parentPath ? `${parentPath}/${input.name}` : input.name;

    const existing = await db.query.folders.findFirst({
      where: eq(folders.path, folderPath),
    });

    if (existing) {
      return existing;
    }

    const parentFolder = parentPath ? await this.getFolderByPath(parentPath) : null;
    const parentId = parentFolder ? parentFolder.id : null;

    const inserted = await db
      .insert(folders)
      .values({
        name: input.name,
        path: folderPath,
        parentId,
        ownerId: input.ownerId,
      })
      .returning();

    const created = inserted[0];
    if (!created) {
      throw new Error('Failed to create folder record');
    }

    return created;
  }
}

export const folderService = new FolderService();