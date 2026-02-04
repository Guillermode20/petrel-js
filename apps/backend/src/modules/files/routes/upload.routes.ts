import type { File as SharedFile } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { uploadRateLimit } from "../../../lib/rate-limit";
import {
	normalizeNameSafe,
	normalizePathSafe,
	parseNumberField,
	resolveFolderPathById,
} from "../../../lib/route-helpers";
import { uploadService } from "../../../services/upload.service";
import { requirePermission } from "../../auth";
import type { ApiResponse } from "../types";

interface UploadPathParams {
	folderId?: string | number;
	path?: string;
}

async function resolveUploadPath(
	params: UploadPathParams,
	set: { status?: number | string },
): Promise<string | null> {
	let folderPath: string | undefined;

	if (params.folderId !== undefined) {
		const folderId = parseNumberField(params.folderId, set, "folderId");
		if (folderId === null) return null;

		const resolvedPath = await resolveFolderPathById(folderId, set);
		if (resolvedPath === null) return null;
		folderPath = resolvedPath;
	}

	const safeFolderPath = normalizePathSafe(folderPath ?? params.path, set);
	return safeFolderPath;
}

export const uploadRoutes = new Elysia({ prefix: "/api" })
	.use(uploadRateLimit)
	.use(requirePermission("upload"))
	.post(
		"/files/upload",
		async ({ body, set, user }): Promise<ApiResponse<SharedFile>> => {
			if (!user) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			const chunkIndex = parseNumberField(body.chunkIndex, set, "chunkIndex");
			const totalChunks = parseNumberField(body.totalChunks, set, "totalChunks");

			if (chunkIndex === null || totalChunks === null) {
				return { data: null, error: "Invalid chunk parameters" };
			}

			if (chunkIndex < 0 || chunkIndex >= totalChunks) {
				set.status = 400;
				return { data: null, error: "Invalid chunk index" };
			}

			const safeFolderPath = await resolveUploadPath(
				{ folderId: body.folderId, path: body.path },
				set,
			);
			if (safeFolderPath === null) return { data: null, error: "Invalid upload path" };

			const safeFileName = normalizeNameSafe(body.fileName, set);
			if (!safeFileName) return { data: null, error: "Invalid file name" };

			const existing = await uploadService.fileExists(safeFolderPath, safeFileName);
			if (existing) {
				set.status = 409;
				return { data: null, error: "File already exists" };
			}

			const result = await uploadService.handleChunk({
				uploadId: body.uploadId,
				chunkIndex,
				totalChunks,
				fileName: safeFileName,
				folderPath: safeFolderPath,
				mimeType: body.mimeType ?? "application/octet-stream",
				chunk: body.chunk,
				userId: user.userId,
			});

			if (!result.allChunksPresent) {
				set.status = 202;
				return { data: null, error: null };
			}

			return { data: result.file, error: null };
		},
		{
			body: t.Object({
				uploadId: t.String({ minLength: 1 }),
				chunkIndex: t.Union([t.Number({ minimum: 0 }), t.String()]),
				totalChunks: t.Union([t.Number({ minimum: 1 }), t.String()]),
				fileName: t.String({ minLength: 1 }),
				path: t.Optional(t.String()),
				folderId: t.Optional(t.Union([t.Number(), t.String()])),
				mimeType: t.Optional(t.String()),
				size: t.Optional(t.Union([t.Number(), t.String()])),
				chunk: t.File(),
			}),
			detail: {
				summary: "Upload a file chunk",
				description: "Accepts chunked uploads and assembles when complete",
				tags: ["Files"],
			},
		},
	);
