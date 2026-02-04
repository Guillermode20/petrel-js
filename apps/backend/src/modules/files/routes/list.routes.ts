import type { File as SharedFile } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { config } from "../../../config";
import {
	canRead,
	getPagination,
	normalizePathSafe,
	parseNumberField,
	resolveFolderPathById,
} from "../../../lib/route-helpers";
import { validateShareAccess } from "../../../lib/share-validation";
import { fileService } from "../../../services/file.service";
import { folderService } from "../../../services/folder.service";
import { shareService } from "../../../services/share.service";
import { authMiddleware } from "../../auth";
import type { ApiResponse, FileListData } from "../types";

const filesListRoute = new Elysia({ prefix: "/api" }).use(authMiddleware).get(
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
);

const fileByIdRoute = new Elysia({ prefix: "/api" }).use(authMiddleware).get(
	"/files/:id",
	async ({ params, user, query, set }): Promise<ApiResponse<SharedFile>> => {
		const file = await fileService.getById(params.id);
		if (!file) {
			set.status = 404;
			return { data: null, error: "File not found" };
		}

		// Check access permissions
		const shareToken = (query as Record<string, unknown> | undefined)?.shareToken;
		const sharePassword = (query as Record<string, unknown> | undefined)?.password;

		if (typeof shareToken === "string" && shareToken.length > 0) {
			const result = await validateShareAccess(
				shareToken,
				typeof sharePassword === "string" ? sharePassword : undefined,
			);
			if (result.error) {
				set.status = result.status;
				return { data: null, error: result.error };
			}

			if (result.share?.share.type === "file") {
				if (result.share?.share.targetId !== file.id) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
			} else {
				const content = await shareService.getShareContent(result.share?.share);
				if (!content || typeof (content as { path?: unknown }).path !== "string") {
					set.status = 400;
					return { data: null, error: "Invalid share" };
				}
				const sharePath = (content as { path: string }).path;
				if (sharePath !== "" && file.path !== sharePath && !file.path.startsWith(`${sharePath}/`)) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
			}
		} else if (!user && !config.PETREL_GUEST_ACCESS) {
			set.status = 401;
			return { data: null, error: "Unauthorized" };
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

export const listRoutes = new Elysia().use(filesListRoute).use(fileByIdRoute);
