import type { Folder } from "@petrel/shared";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { folders } from "../../db/schema";
import { normalizeRelativePath } from "../lib/storage";
import { fileService } from "./file.service";

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

	async listByParentId(parentId: number | null, search?: string, folderPath?: string): Promise<Folder[]> {
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
					conditions.push(sql`(${folders.path} = ${normalizedPath} OR ${folders.path} LIKE ${pathPattern})`);
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
						conditions.push(sql`(${folders.path} = ${normalizedPath} OR ${folders.path} LIKE ${pathPattern})`);
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

		const whereClause = conditions.length === 0 
			? undefined 
			: conditions.length > 1 
				? and(...conditions) 
				: conditions[0];

		return await db.query.folders.findMany({
			where: whereClause,
		});
	}

	async createFolder(input: CreateFolderInput): Promise<Folder> {
		const parentPath = input.parentPath ? normalizeRelativePath(input.parentPath) : "";
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
			throw new Error("Failed to create folder record");
		}

		return created;
	}

	async getParentChain(folderId: number | null): Promise<Folder[]> {
		if (folderId === null) {
			return [];
		}

		const visited = new Set<number>();
		const chain: Folder[] = [];
		let currentId: number | null = folderId;

		while (currentId !== null) {
			if (visited.has(currentId)) {
				break;
			}
			visited.add(currentId);

			const current = await this.getById(currentId);
			if (!current) {
				break;
			}

			chain.push(current);
			currentId = current.parentId;
		}

		return chain.reverse();
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

	private async updateChildrenPaths(
		folderId: number,
		oldParentPath: string,
		newParentPath: string,
	): Promise<void> {
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
}

export const folderService = new FolderService();
