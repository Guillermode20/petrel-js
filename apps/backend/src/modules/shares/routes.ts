import { stat } from "node:fs/promises";
import type { File } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { shareRateLimit } from "../../lib/rate-limit";
import { validateShareAccess } from "../../lib/share-validation";
import { fileService } from "../../services/file.service";
import { folderService } from "../../services/folder.service";
import { shareService } from "../../services/share.service";
import {
	buildZipDownloadFilename,
	createZipArchive,
	getPrimaryJobFolderName,
	getZipJob,
	scheduleZipCleanup,
} from "../../services/zip.service";
import { authMiddleware, requireAuth } from "../auth";
import { settingsService } from "../settings/service";
import type { ApiResponse, ShareContentData, ShareData } from "./types";

type RouteSet = { status?: number; headers?: Record<string, string> };

const protectedRoutes = new Elysia({ prefix: "/shares" })
	.use(requireAuth)
	.get(
		"",
		async ({ user, set }): Promise<ApiResponse<ShareContentData[]>> => {
			const list = await shareService.listByUser(user.userId);
			const enriched = await Promise.all(
				list.map(async (item) => ({
					share: item.share,
					settings: item.settings,
					content: await shareService.getShareContent(item.share),
				})),
			);

			return { data: enriched, error: null };
		},
		{
			detail: {
				summary: "List share links",
				description: "Returns all shares created by the authenticated user",
				tags: ["Shares"],
			},
		},
	)
	.post(
		"",
		async ({ user, set, body }): Promise<ApiResponse<ShareData>> => {
			const settings = await settingsService.getUserSettings(user.userId);

			const expiresAtInput = body.expiresAt ?? null;
			let parsedExpiry = parseExpiry(expiresAtInput, set);

			// If no expiry provided, use default from settings
			if (expiresAtInput === null && settings.sharing.defaultExpiry !== "never") {
				const now = new Date();
				switch (settings.sharing.defaultExpiry) {
					case "1h":
						parsedExpiry = new Date(now.getTime() + 60 * 60 * 1000);
						break;
					case "24h":
						parsedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
						break;
					case "7d":
						parsedExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
						break;
					case "30d":
						parsedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
						break;
				}
			}

			if (parsedExpiry === undefined && body.expiresAt !== undefined && body.expiresAt !== null) {
				return { data: null, error: "Invalid expiry" };
			}

			const created = await shareService.createShare({
				type: body.type,
				targetId: body.targetId,
				expiresAt: parsedExpiry ?? null,
				password: body.password ?? (settings.sharing.defaultPasswordProtection ? "" : null),
				allowDownload: body.allowDownload ?? settings.sharing.defaultDownloadPermission,
				allowZip: body.allowZip ?? false,
				showMetadata: body.showMetadata ?? true,
				createdBy: user.userId,
			});

			return { data: { share: created.share, settings: created.settings }, error: null };
		},
		{
			body: t.Object({
				type: t.Union([t.Literal("file"), t.Literal("folder")]),
				targetId: t.Number({ minimum: 1 }),
				expiresAt: t.Optional(t.Union([t.String(), t.Null()])),
				password: t.Optional(t.Union([t.String(), t.Null()])),
				allowDownload: t.Optional(t.Boolean()),
				allowZip: t.Optional(t.Boolean()),
				showMetadata: t.Optional(t.Boolean()),
			}),
			detail: {
				summary: "Create share link",
				description: "Creates a share link with optional expiry and password",
				tags: ["Shares"],
			},
		},
	)
	.delete(
		"/:id",
		async ({ params, set }): Promise<ApiResponse<{ id: number }>> => {
			await shareService.deleteShare(params.id);
			return { data: { id: params.id }, error: null };
		},
		{
			params: t.Object({ id: t.Number({ minimum: 1 }) }),
			detail: {
				summary: "Revoke share link",
				description: "Deletes a share",
				tags: ["Shares"],
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body, set }): Promise<ApiResponse<ShareData>> => {
			let expiresAtValue: Date | null | undefined;
			if (body.expiresAt !== undefined) {
				const parsed = parseExpiry(body.expiresAt, set);
				if (parsed === undefined && body.expiresAt !== null) {
					return { data: null, error: "Invalid expiry" };
				}
				expiresAtValue = parsed ?? null;
			}

			const updated = await shareService.updateShare(params.id, {
				expiresAt: expiresAtValue,
				password: body.password,
				allowDownload: body.allowDownload,
				allowZip: body.allowZip,
				showMetadata: body.showMetadata,
			});

			if (!updated) {
				set.status = 404;
				return { data: null, error: "Share not found" };
			}

			return { data: { share: updated.share, settings: updated.settings }, error: null };
		},
		{
			params: t.Object({ id: t.Number({ minimum: 1 }) }),
			body: t.Object({
				expiresAt: t.Optional(t.Union([t.String(), t.Null()])),
				password: t.Optional(t.Union([t.String(), t.Null()])),
				allowDownload: t.Optional(t.Boolean()),
				allowZip: t.Optional(t.Boolean()),
				showMetadata: t.Optional(t.Boolean()),
			}),
			detail: {
				summary: "Update share link",
				description: "Updates expiry or password for a share",
				tags: ["Shares"],
			},
		},
	);

function parseExpiry(value: string | null, set: RouteSet): Date | null | undefined {
	if (value === null || value === undefined) {
		return null;
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
		set.status = 400;
		return undefined;
	}

	return parsed;
}

const publicRoutes = new Elysia({ prefix: "/shares" })
	.use(shareRateLimit)
	.get(
		"/:token/download",
		async ({ params, query, set }) => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				set.status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				return { data: null, error };
			}

			if (!share?.settings.allowDownload) {
				set.status = 403;
				return { data: null, error: "Download not allowed for this share" };
			}

			const content = await shareService.getShareContent(share?.share);
			if (!content || share?.share.type !== "file") {
				set.status = 400;
				return { data: null, error: "Download not available for this share" };
			}

			const fileRecord = content as File;
			const filePath = fileService.resolveDiskPath(fileRecord);
			const fileStat = await stat(filePath).catch(() => null);

			if (!fileStat) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			if (!set.headers) {
				set.headers = {} as Record<string, string>;
			}
			const headers = set.headers;
			headers["Content-Type"] = fileRecord.mimeType;
			headers["Content-Length"] = fileStat.size.toString();
			headers["Content-Disposition"] = `attachment; filename="${fileRecord.name}"`;

			await shareService.incrementDownloadCount(share?.share.id);

			return new Response(Bun.file(filePath));
		},
		{
			params: t.Object({
				token: t.String({ minLength: 1 }),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
				h: t.Optional(t.String()), // Hidden password param
			}),
			detail: {
				summary: "Download shared file",
				description: "Streams the shared file for download",
				tags: ["Shares"],
			},
		},
	)
	.post(
		"/:token/download-zip",
		async ({ params, body, query, set }) => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				set.status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				return { data: null, error };
			}

			if (!share?.settings.allowZip) {
				set.status = 403;
				return { data: null, error: "ZIP download not allowed for this share" };
			}

			// Get the files/folders to include in the ZIP
			const fileIds = body.fileIds;
			const folderIds = body.folderIds;

			if ((!fileIds || fileIds.length === 0) && (!folderIds || folderIds.length === 0)) {
				set.status = 400;
				return { data: null, error: "No files or folders specified" };
			}

			// Validate fileIds if provided
			if (fileIds && fileIds.length > 0) {
				for (const fileId of fileIds) {
					const file = await fileService.getById(fileId);
					if (!file) {
						set.status = 404;
						return { data: null, error: `File ${fileId} not found` };
					}

					// If it's a folder share, verify file is within the shared folder
					if (share?.share.type === "folder") {
						const shareContent = await shareService.getShareContent(share?.share);
						if (!shareContent) {
							set.status = 400;
							return { data: null, error: "Invalid share" };
						}
						if (file.parentId === null) {
							set.status = 403;
							return { data: null, error: `File ${fileId} not accessible via this share` };
						}
						const isInFolder = await folderService.isDescendantOf(
							file.parentId,
							(shareContent as { path: string }).path,
						);
						if (!isInFolder) {
							set.status = 403;
							return { data: null, error: `File ${fileId} not accessible via this share` };
						}
					} else if (share?.share.type === "file" && share?.share.targetId !== fileId) {
						// For file shares, only the shared file is accessible
						set.status = 403;
						return { data: null, error: `File ${fileId} not accessible via this share` };
					}
				}
			}

			// Validate folderIds if provided (must be within share for folder shares)
			if (folderIds && folderIds.length > 0 && share?.share.type === "folder") {
				const shareContent = await shareService.getShareContent(share?.share);
				if (!shareContent) {
					set.status = 400;
					return { data: null, error: "Invalid share" };
				}
				const sharePath = (shareContent as { path: string }).path;

				for (const folderId of folderIds) {
					const folder = await folderService.getById(folderId);
					if (!folder) {
						set.status = 404;
						return { data: null, error: `Folder ${folderId} not found` };
					}
					// Verify folder is within the shared folder hierarchy
					const isInShare = folder.path === sharePath || folder.path.startsWith(`${sharePath}/`);
					if (!isInShare) {
						set.status = 403;
						return { data: null, error: `Folder ${folderId} not accessible via this share` };
					}
				}
			}

			// Create ZIP archive
			const result = await createZipArchive({
				fileIds,
				folderIds,
				shareToken: params.token,
			});

			if (!result.success) {
				set.status = 400;
				return { data: null, error: result.error };
			}

			// Return job ID for polling
			return { data: { jobId: result.jobId, status: "processing" }, error: null };
		},
		{
			params: t.Object({
				token: t.String({ minLength: 1 }),
			}),
			body: t.Object({
				fileIds: t.Optional(t.Array(t.Number({ minimum: 1 }), { minItems: 1, maxItems: 100 })),
				folderIds: t.Optional(t.Array(t.Number({ minimum: 1 }), { minItems: 1, maxItems: 10 })),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
			detail: {
				summary: "Create ZIP download",
				description: "Creates a ZIP archive of selected files and folders",
				tags: ["Shares"],
			},
		},
	)
	.get(
		"/:token/download-zip/:jobId",
		async ({ params, query, set, request }) => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				set.status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				return { data: null, error };
			}

			const job = await getZipJob(params.jobId);
			if (!job) {
				set.status = 404;
				return { data: null, error: "Job not found" };
			}

			if (job.shareToken !== params.token) {
				set.status = 403;
				return { data: null, error: "Access denied" };
			}

			if (job.status === "error") {
				set.status = 500;
				return { data: null, error: job.error || "ZIP creation failed" };
			}

			const wantsJson =
				query.format === "json" ||
				(request.headers.get("accept")?.includes("application/json") ?? false);

			if (job.status !== "completed" || !job.tempPath || wantsJson) {
				// Return progress
				return {
					data: { jobId: params.jobId, status: job.status, progress: job.progress },
					error: null,
				};
			}

			// Stream the ZIP file
			const fileStat = await stat(job.tempPath).catch(() => null);
			if (!fileStat) {
				set.status = 404;
				return { data: null, error: "ZIP file not found" };
			}

			// Generate filename
			const primaryFolderName = await getPrimaryJobFolderName(job);
			const filename = buildZipDownloadFilename(
				query.filename,
				job.completedAt ?? new Date(),
				primaryFolderName,
			);

			if (!set.headers) {
				set.headers = {} as Record<string, string>;
			}
			const headers = set.headers;
			headers["Content-Type"] = "application/zip";
			headers["Content-Length"] = fileStat.size.toString();
			headers["Content-Disposition"] = `attachment; filename="${filename}"`;

			const response = new Response(Bun.file(job.tempPath));

			// Increment download count when the actual download is initiated
			await shareService.incrementDownloadCount(share?.share.id);

			// Clean up after streaming (fire and forget)
			scheduleZipCleanup(params.jobId);

			return response;
		},
		{
			params: t.Object({
				token: t.String({ minLength: 1 }),
				jobId: t.String({ minLength: 1 }),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
				filename: t.Optional(t.String()),
				format: t.Optional(t.Union([t.Literal("json"), t.Literal("file")])),
			}),
			detail: {
				summary: "Download ZIP file",
				description: "Downloads the generated ZIP archive",
				tags: ["Shares"],
			},
		},
	)
	.get(
		"/:token/folder/:folderId",
		async ({ params, query, set }): Promise<ApiResponse<ShareContentData>> => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				set.status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				return { data: null, error };
			}

			// Get the shared folder to verify hierarchy
			const shareContent = await shareService.getShareContent(share?.share);
			if (!shareContent || share?.share.type !== "folder") {
				set.status = 400;
				return { data: null, error: "Invalid share type" };
			}

			// Verify requested folder is within the shared folder hierarchy
			const isDescendant = await folderService.isDescendantOf(params.folderId, shareContent.path);
			if (!isDescendant) {
				set.status = 403;
				return { data: null, error: "Access denied" };
			}

			// Get the requested folder
			const folder = await folderService.getById(params.folderId);
			if (!folder) {
				set.status = 404;
				return { data: null, error: "Folder not found" };
			}

			// Get child folders and files
			const childFolders = await folderService.listByParentId(folder.id);
			const fileList = await fileService.listByPath(folder.path, 100, 0);

			return {
				data: {
					share: share?.share,
					settings: share?.settings,
					content: folder,
					files: fileList.files,
					folders: childFolders,
				},
				error: null,
			};
		},
		{
			params: t.Object({
				token: t.String({ minLength: 1 }),
				folderId: t.Number({ minimum: 1 }),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
			detail: {
				summary: "Get shared subfolder contents",
				description: "Returns contents of a subfolder within a shared folder",
				tags: ["Shares"],
			},
		},
	)
	.get(
		"/:token",
		async ({ params, query, set }): Promise<ApiResponse<ShareContentData>> => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				set.status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				return { data: null, error };
			}

			await shareService.incrementViewCount(share?.share.id);

			const content = await shareService.getShareContent(share?.share);
			let files;
			let folders;

			if (share?.share.type === "folder" && content) {
				const childFolders = await folderService.listByParentId(content.id);
				folders = childFolders;

				const fileList = await fileService.listByPath(content.path, 100, 0);
				files = fileList.files;
			}

			return {
				data: {
					share: share?.share,
					settings: share?.settings,
					content,
					files,
					folders,
				},
				error: null,
			};
		},
		{
			params: t.Object({
				token: t.String({ minLength: 1 }),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
			detail: {
				summary: "Get shared content",
				description: "Returns share metadata and settings for a token",
				tags: ["Shares"],
			},
		},
	);

export const shareRoutes = new Elysia({ prefix: "/api" })
	.use(publicRoutes)
	.use(authMiddleware)
	.use(protectedRoutes);
