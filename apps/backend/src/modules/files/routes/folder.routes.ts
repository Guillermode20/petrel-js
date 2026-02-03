import type { Folder } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { normalizeNameSafe, normalizePathSafe, parseNumberField } from "../../../lib/route-helpers";
import { folderService } from "../../../services/folder.service";
import { requireAuth, requirePermission } from "../../auth";
import type { ApiResponse } from "../types";

export const folderRoutes = new Elysia({ prefix: "/api" })
	.use(requireAuth)
	.use(requirePermission("createFolders"))
	.post(
		"/folders",
		async ({ body, user, set }): Promise<ApiResponse<Folder>> => {
			const safeName = normalizeNameSafe(body.name, set);
			if (!safeName) {
				return { data: null, error: "Invalid folder name" };
			}

			const parentPath = body.parentPath ? normalizePathSafe(body.parentPath, set) : "";
			if (parentPath === null) {
				return { data: null, error: "Invalid parent path" };
			}

			try {
				const folder = await folderService.createFolder({
					name: safeName,
					parentPath,
					ownerId: user.userId,
				});

				return { data: folder, error: null };
			} catch (err) {
				set.status = 500;
				return {
					data: null,
					error: err instanceof Error ? err.message : "Failed to create folder",
				};
			}
		},
		{
			body: t.Object({
				name: t.String({ minLength: 1 }),
				parentPath: t.Optional(t.Union([t.String(), t.Null()])),
			}),
			detail: {
				summary: "Create folder",
				description: "Creates a new folder at the specified path",
				tags: ["Folders"],
			},
		},
	)
	.patch(
		"/folders/:id",
		async ({ params, body, user, set }): Promise<ApiResponse<Folder>> => {
			const folderId = Number.parseInt(params.id, 10);
			if (Number.isNaN(folderId)) {
				set.status = 400;
				return { data: null, error: "Invalid folder ID" };
			}

			const folder = await folderService.getById(folderId);
			if (!folder) {
				set.status = 404;
				return { data: null, error: "Folder not found" };
			}

			// Ownership check
			if (user.role !== "admin" && folder.ownerId !== null && folder.ownerId !== user.userId) {
				set.status = 403;
				return { data: null, error: "Forbidden - You can only modify your own folders" };
			}

			const updateData: { name?: string; parentId?: number | null } = {};

			if (body.name !== undefined) {
				const safeName = normalizeNameSafe(body.name, set);
				if (!safeName) {
					return { data: null, error: "Invalid folder name" };
				}
				updateData.name = safeName;
			}

			if (body.parentId !== undefined) {
				const parentId =
					body.parentId === null ? null : parseNumberField(body.parentId, set, "parentId");
				if (parentId === undefined) {
					return { data: null, error: "Invalid parent ID" };
				}
				updateData.parentId = parentId;
			}

			try {
				const updated = await folderService.updateFolder(folderId, updateData);
				if (!updated) {
					set.status = 404;
					return { data: null, error: "Folder not found" };
				}

				return { data: updated, error: null };
			} catch (err) {
				set.status = 500;
				return {
					data: null,
					error: err instanceof Error ? err.message : "Failed to update folder",
				};
			}
		},
		{
			params: t.Object({
				id: t.String(),
			}),
			body: t.Object({
				name: t.Optional(t.String({ minLength: 1 })),
				parentId: t.Optional(t.Union([t.Number(), t.String(), t.Null()])),
			}),
			detail: {
				summary: "Update folder",
				description: "Renames or moves a folder",
				tags: ["Folders"],
			},
		},
	);
