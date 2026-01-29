import { eq, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { folders } from '../../db/schema';
import type { Folder } from '@petrel/shared';
import { normalizeRelativePath } from '../lib/storage';
import { fileService } from './file.service';

export interface CreateFolderInput {
  name: string;
  parentPath: string | null;
  ownerId: number | null;
}

export class FolderService {
  async getById(id: number): Promise<Folder | null> {
    const folder = await db.query.folders.findFirst({
      where: eq(folders.id, id),
    });

    return folder ?? null;
  }

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

  async updateFolder(id: number, input: { name?: string; parentId?: number | null }): Promise<Folder | null> {
    const current = await this.getById(id);
    if (!current) return null;

    const nextName = input.name ?? current.name;
    let nextParentId = current.parentId;
    let nextPath = current.path;

    if (input.parentId !== undefined) {
      nextParentId = input.parentId;
    }

    if (input.name !== undefined || input.parentId !== undefined) {
      let parentPath = '';
      if (nextParentId !== null) {
        const parent = await this.getById(nextParentId);
        if (parent) {
          parentPath = parent.path;
        }
      }
      nextPath = parentPath ? `${parentPath}/${nextName}` : nextName;
    }

    const updated = await db
      .update(folders)
      .set({
        name: nextName,
        parentId: nextParentId,
        path: nextPath,
      })
      .where(eq(folders.id, id))
      .returning();

    const updatedFolder = updated[0];
    if (updatedFolder && nextPath !== current.path) {
      // Recursively update children paths
      await this.updateChildrenPaths(id, current.path, nextPath);
    }

    return updatedFolder ?? null;
  }

  private async updateChildrenPaths(folderId: number, oldParentPath: string, newParentPath: string): Promise<void> {
    // Update files in this folder
    await fileService.updateFilesPathInFolder(oldParentPath, newParentPath);

    // Recursively update subfolders
    const children = await this.listByParentId(folderId);
    for (const child of children) {
      const nextChildPath = newParentPath + child.path.slice(oldParentPath.length);
      await db.update(folders).set({ path: nextChildPath }).where(eq(folders.id, child.id));
      await this.updateChildrenPaths(child.id, child.path, nextChildPath);
    }
  }
}

export const folderService = new FolderService();