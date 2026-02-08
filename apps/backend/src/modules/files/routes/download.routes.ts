import { stat } from "node:fs/promises";
import { Elysia, t } from "elysia";
import { config } from "../../../config";
import { validateShareAccess } from "../../../lib/share-validation";
import { fileService } from "../../../services/file.service";
import { authMiddleware } from "../../auth";

export const downloadRoutes = new Elysia({ prefix: "/api" }).use(authMiddleware).get(
	"/files/:id/download",
	async ({ params, user, query, set }) => {
		const fileId = params.id;
		const file = await fileService.getById(fileId);

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

			if (!result.share?.settings.allowDownload) {
				set.status = 403;
				return { data: null, error: "Download not allowed for this share" };
			}

			// Ensure file is within the share scope
			if (result.share?.share.type === "file") {
				if (result.share?.share.targetId !== file.id) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
			} else {
				// Folder shares are ZIP-only for downloads
				set.status = 403;
				return { data: null, error: "Direct download not available for folder shares" };
			}
		} else if (!user && !config.PETREL_GUEST_ACCESS) {
			set.status = 401;
			return { data: null, error: "Unauthorized" };
		}

		const filePath = fileService.resolveDiskPath(file);
		const fileStat = await stat(filePath).catch(() => null);

		if (!fileStat) {
			set.status = 404;
			return { data: null, error: "File not found on disk" };
		}

		set.headers["Content-Type"] = file.mimeType;
		set.headers["Content-Length"] = fileStat.size.toString();
		set.headers["Content-Disposition"] = `attachment; filename="${file.name}"`;

		return new Response(Bun.file(filePath));
	},
	{
		params: t.Object({
			id: t.Number(),
		}),
		detail: {
			summary: "Download file",
			description: "Streams a file download by id",
			tags: ["Files"],
		},
	},
);
