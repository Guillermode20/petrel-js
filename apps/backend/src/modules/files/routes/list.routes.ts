import type { File as SharedFile } from "@petrel/shared";
import { Elysia, t } from "elysia";
import {
	canRead,
	getPagination,
	normalizePathSafe,
	parseNumberField,
	resolveFolderPathById,
} from "../../../lib/route-helpers";
import { fileService } from "../../../services/file.service";
import { folderService } from "../../../services/folder.service";
import { authMiddleware } from "../../auth";
import { fileReadGuard } from "../guards";
import type { ApiResponse, FileListData } from "../types";

export const listRoutes = new Elysia({ prefix: "/api" })
	.use(authMiddleware)
	.get(
		"/files",
		async ({ query, set, user }): Promise<ApiResponse<FileListData>> => {
			if (!canRead(user)) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}
			let folderPath: string | null = null;
			if (query.folderId !== undefined) {
				const folderId = parseNumberField(query.folderId, set, "folderId");
				if (folderId === null) {
					return { data: null, error: "Invalid folder id" };
				}
				folderPath = await resolveFolderPathById(folderId, set);
				if (folderPath === null) {
					return { data: null, error: "Folder not found" };
				}
			} else {
				folderPath = normalizePathSafe(query.path, set);
			}
			if (folderPath === null) {
				return { data: null, error: "Invalid path" };
			}
			const { limit, offset } = getPagination({
				limit: query.limit,
				offset: query.offset,
			});

			const searchQuery = query.search?.trim() || undefined;

			const [fileResult, parentFolder] = await Promise.all([
				fileService.listByPath(folderPath, limit, offset, searchQuery),
				folderPath ? folderService.getFolderByPath(folderPath) : Promise.resolve(null),
			]);

			const [folders, parentChain] = await Promise.all([
				parentFolder
					? folderService.listByParentId(parentFolder.id, searchQuery, folderPath)
					: folderPath
						? Promise.resolve([])
						: folderService.listByParentId(null, searchQuery, folderPath),
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
						total: fileResult.total + folders.length,
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
				search: t.Optional(t.String()),
			}),
			detail: {
				summary: "List files and folders",
				description: "Returns files and folders within a path with pagination",
				tags: ["Files"],
			},
		},
	)
	.use(fileReadGuard)
	.get(
		"/files/:id",
		async ({ file, set }): Promise<ApiResponse<SharedFile>> => {
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			return { data: file, error: null };
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			detail: {
				summary: "Get file metadata",
				description: "Returns metadata for a single file",
				tags: ["Files"],
			},
		},
	);
