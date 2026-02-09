import type { Folder } from "@petrel/shared";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { folders } from "../../db/schema";
import { Cacheable, cacheKeys, cacheManager, cacheTTL } from "../cache";
import { logger } from "../lib/logger";
import { normalizeRelativePath } from "../lib/storage";
import type { DatabaseTransaction } from "../types/db";
import { fileService } from "./file.service";

export interface CreateFolderInput {
	name: string;
	parentPath: string | null;
	ownerId: number | null;
}

export class FolderService {
	private mapFolderRow(row: typeof folders.$inferSelect): Folder {
		return {
			id: row.id,
			name: row.name,
			path: row.path,
			parentId: row.parentId,
			ownerId: row.ownerId,
		};
	}

	@Cacheable({ key: (id: number) => cacheKeys.folder(id), ttl: cacheTTL.folder })
	async getById(id: number): Promise<Folder | null> {
		const folder = await db.query.folders.findFirst({
			where: eq(folders.id, id),
		});

		return folder ? this.mapFolderRow(folder) : null;
	}

	@Cacheable({ key: (path: string) => cacheKeys.folderByPath(path), ttl: cacheTTL.folder })
	async getFolderByPath(path: string): Promise<Folder | null> {
		const normalizedPath = normalizeRelativePath(path);
		const folder = await db.query.folders.findFirst({
			where: eq(folders.path, normalizedPath),
		});

		return folder ? this.mapFolderRow(folder) : null;
	}

	async listByParentId(
		parentId: number | null,
		search?: string,
		folderPath?: string,
	): Promise<Folder[]> {
		const conditions = [];

		// When search is provided, search recursively in subfolders
		// When search is NOT provided, only search direct children
		if (search) {
			// Recursive search: find all folders that match name, regardless of depth
			if (parentId === null) {
				// Root folder: search all folders
				// No parentId constraint needed
			} else if (folderPath) {
				// Find all folders that are descendants of the current folder
				const normalizedPath = normalizeRelativePath(folderPath);
				if (normalizedPath === "") {
					// Root: search all folders
					// No path constraint needed
				} else {
					// Current folder or subfolders
					const pathPattern = `${normalizedPath}/%`;
					conditions.push(
						sql`(${folders.path} = ${normalizedPath} OR ${folders.path} LIKE ${pathPattern})`,
					);
				}
			} else {
				// Fallback: if folderPath not provided, get it from parentId
				const parentFolder = await this.getById(parentId);
				if (parentFolder) {
					const normalizedPath = normalizeRelativePath(parentFolder.path);
					if (normalizedPath === "") {
						// Root: search all folders
					} else {
						const pathPattern = `${normalizedPath}/%`;
						conditions.push(
							sql`(${folders.path} = ${normalizedPath} OR ${folders.path} LIKE ${pathPattern})`,
						);
					}
				}
			}

			const searchPattern = `%${search}%`;
			conditions.push(sql`lower(${folders.name}) LIKE lower(${searchPattern})`);
		} else {
			// Non-recursive: only direct children
			if (parentId === null) {
				conditions.push(isNull(folders.parentId));
			} else {
				conditions.push(eq(folders.parentId, parentId));
			}
		}

		const whereClause =
			conditions.length === 0
				? undefined
				: conditions.length > 1
					? and(...conditions)
					: conditions[0];

		const results = await db.query.folders.findMany({
			where: whereClause,
		});

		return results.map((row) => this.mapFolderRow(row));
	}

	async createFolder(input: CreateFolderInput): Promise<Folder> {
		const parentPath = input.parentPath ? normalizeRelativePath(input.parentPath) : "";
		const folderPath = parentPath ? `${parentPath}/${input.name}` : input.name;

		const existing = await db.query.folders.findFirst({
			where: eq(folders.path, folderPath),
		});

		if (existing) {
			return this.mapFolderRow(existing);
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

		await cacheManager.delPattern(cacheKeys.pattern.allFolders());

		const created = (inserted as (typeof folders.$inferSelect)[])[0];
		if (!created) {
			throw new Error("Failed to create folder record");
		}

		return this.mapFolderRow(created);
	}

	async getParentChain(folderId: number | null): Promise<Folder[]> {
		if (folderId === null) {
			return [];
		}

		// Use recursive CTE for single query instead of N+1 queries
		// Track depth to prevent infinite recursion from circular references
		const result = await db.all(sql`
			WITH RECURSIVE parent_chain(id, name, path, parent_id, owner_id, depth) AS (
				SELECT id, name, path, parent_id, owner_id, 0 as depth FROM folders WHERE id = ${folderId}
				UNION ALL
				SELECT f.id, f.name, f.path, f.parent_id, f.owner_id, pc.depth + 1
				FROM folders f
				INNER JOIN parent_chain pc ON f.id = pc.parent_id
				WHERE pc.parent_id IS NOT NULL AND pc.depth < 100
			)
			SELECT id, name, path, parent_id as parentId, owner_id as ownerId
			FROM parent_chain
			ORDER BY depth DESC
		`);

		// Order by depth DESC gives root-to-leaf (root first, leaf last)
		// So result is already in correct order: [root, ..., leaf]
		return result.map((row) => this.mapFolderRow(row as typeof folders.$inferSelect));
	}

	async updateFolder(
		id: number,
		input: { name?: string; parentId?: number | null },
	): Promise<Folder | null> {
		const current = await this.getById(id);
		if (!current) return null;

		const nextName = input.name ?? current.name;
		let nextParentId = current.parentId;
		let nextPath = current.path;

		if (input.parentId !== undefined) {
			nextParentId = input.parentId;
		}

		if (input.name !== undefined || input.parentId !== undefined) {
			let parentPath = "";
			if (nextParentId !== null) {
				const parent = await this.getById(nextParentId);
				if (parent) {
					parentPath = parent.path;
				}
			}
			nextPath = parentPath ? `${parentPath}/${nextName}` : nextName;
		}

		return await db.transaction(async (tx) => {
			const updated = await tx
				.update(folders)
				.set({
					name: nextName,
					parentId: nextParentId,
					path: nextPath,
				})
				.where(eq(folders.id, id))
				.returning();

			const updatedFolder = (updated as (typeof folders.$inferSelect)[])[0];

			if (updatedFolder && nextPath !== current.path) {
				// Recursively update children paths within the same transaction
				await this.updateChildrenPathsInternal(id, current.path, nextPath, tx);
			}

			// Invalidate caches after transaction succeeds
			await Promise.all([
				cacheManager.del(cacheKeys.folder(id)),
				cacheManager.del(cacheKeys.folderByPath(current.path)),
				cacheManager.del(cacheKeys.folderByPath(nextPath)),
				cacheManager.delPattern(cacheKeys.pattern.allFolders()),
				cacheManager.delPattern(cacheKeys.pattern.fileLists()),
			]);

			return updatedFolder ? this.mapFolderRow(updatedFolder) : null;
		});
	}

	private async updateChildrenPathsInternal(
		folderId: number,
		oldParentPath: string,
		newParentPath: string,
		tx: DatabaseTransaction | typeof db,
		visited: Set<number> = new Set(),
	): Promise<void> {
		if (visited.has(folderId)) {
			throw new Error(`Circular reference detected in folder hierarchy at ID: ${folderId}`);
		}
		visited.add(folderId);

		// Update files in this folder
		await fileService.updateFilesPathInFolderInternal(oldParentPath, newParentPath, tx);

		// Recursively update subfolders
		const children = await tx.query.folders.findMany({
			where: eq(folders.parentId, folderId),
		});

		for (const child of children) {
			const nextChildPath = newParentPath + child.path.slice(oldParentPath.length);
			await tx.update(folders).set({ path: nextChildPath }).where(eq(folders.id, child.id));
			await this.updateChildrenPathsInternal(child.id, child.path, nextChildPath, tx, visited);
		}
	}

	/**
	 * Check if a folder is a descendant of (or equal to) an ancestor path
	 * Used for share validation to ensure subfolder requests are within shared hierarchy
	 */
	async isDescendantOf(folderId: number, ancestorPath: string): Promise<boolean> {
		const folder = await this.getById(folderId);
		if (!folder) return false;

		const normalizedAncestor = normalizeRelativePath(ancestorPath);
		const normalizedFolder = normalizeRelativePath(folder.path);

		// Folder is the ancestor itself, or a direct child (starts with ancestor/)
		return (
			normalizedFolder === normalizedAncestor ||
			normalizedFolder.startsWith(`${normalizedAncestor}/`)
		);
	}

	async deleteFolder(id: number): Promise<void> {
		await db.delete(folders).where(eq(folders.id, id));
		await cacheManager.delPattern(cacheKeys.pattern.allFolders());
	}
}

export const folderService = new FolderService();
