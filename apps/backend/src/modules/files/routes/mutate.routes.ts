import { Elysia, t } from "elysia";
import { TEXT_MIME_TYPES } from "../../../constants/mime-types";
import {
	normalizeNameSafe,
	normalizePathSafe,
	parseNumberField,
	resolveFolderPathById,
} from "../../../lib/route-helpers";
import {
	buildFileRelativePath,
	ensureDirectory,
	moveFileOnDisk,
	resolveStoragePath,
} from "../../../lib/storage";
import { fileService } from "../../../services/file.service";
import { fileOwnershipGuard } from "../guards";
import type { ApiResponse } from "../types";

async function resolveUpdatePath(
	fileId: number,
	body: { path?: string; folderId?: string | number },
	set: { status?: number | string },
): Promise<string | undefined> {
	if (body.path === undefined && body.folderId === undefined) {
		return undefined;
	}

	let folderPath: string | undefined;
	if (body.folderId !== undefined) {
		const folderId = parseNumberField(body.folderId, set, "folderId");
		if (folderId === null) return undefined;

		const resolvedPath = await resolveFolderPathById(folderId, set);
		if (resolvedPath === null) return undefined;
		folderPath = resolvedPath;
	} else if (body.path !== undefined) {
		const normalized = normalizePathSafe(body.path, set);
		if (normalized === null) return undefined;
		folderPath = normalized;
	}

	return folderPath;
}

export const mutateRoutes = new Elysia({ prefix: "/api" })
	.use(fileOwnershipGuard)
	.patch(
		"/files/:id",
		async ({
			file,
			body,
			set,
		}): Promise<ApiResponse<{ id: number; name: string; path: string }>> => {
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			const updateData: { name?: string; path?: string } = {};

			if (body.name !== undefined) {
				const safeName = normalizeNameSafe(body.name, set);
				if (!safeName) {
					return { data: null, error: "Invalid file name" };
				}
				updateData.name = safeName;
			}

			const folderPath = await resolveUpdatePath(file.id, body, set);
			if (folderPath !== undefined) {
				updateData.path = folderPath;
			}

			const updated = await fileService.updateFile(file.id, updateData);
			if (!updated) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			const currentDiskPath = fileService.resolveDiskPath(file);
			const nextDiskPath = resolveStoragePath(buildFileRelativePath(updated.path, updated.name));
			await ensureDirectory(updated.path);
			await moveFileOnDisk(currentDiskPath, nextDiskPath);

			return {
				data: { id: updated.id, name: updated.name, path: updated.path },
				error: null,
			};
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			body: t.Object({
				name: t.Optional(t.String({ minLength: 1 })),
				path: t.Optional(t.String()),
				folderId: t.Optional(t.Union([t.Number(), t.String()])),
			}),
			detail: {
				summary: "Rename or move file",
				description: "Updates file name or path/folder",
				tags: ["Files"],
			},
		},
	)
	.delete(
		"/files/:id",
		async ({ file, set }): Promise<ApiResponse<{ id: number }>> => {
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			const deleted = await fileService.deleteFile(file.id);
			if (!deleted) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			return { data: { id: deleted.id }, error: null };
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			detail: {
				summary: "Delete file",
				description: "Permanently deletes a file and all derived assets",
				tags: ["Files"],
			},
		},
	)
	.put(
		"/files/:id/content",
		async ({
			file,
			body,
			set,
		}): Promise<ApiResponse<{ id: number; size: number; hash: string }>> => {
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			if (!TEXT_MIME_TYPES.includes(file.mimeType)) {
				set.status = 400;
				return { data: null, error: "File editing is only supported for text files" };
			}

			const updated = await fileService.updateFileContent(file.id, body.content);
			if (!updated) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			return {
				data: { id: updated.id, size: updated.size, hash: updated.hash },
				error: null,
			};
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			body: t.Object({
				content: t.String({ minLength: 0 }),
			}),
			detail: {
				summary: "Edit text file content",
				description: "Updates the content of a text file",
				tags: ["Files"],
			},
		},
	);
