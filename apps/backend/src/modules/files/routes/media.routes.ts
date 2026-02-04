import type { ApiResponse } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { config } from "../../../config";
import { parseThumbnailSize } from "../../../lib/route-helpers";
import { validateShareAccess } from "../../../lib/share-validation";
import type { SpriteMetadata } from "../../../lib/thumbnails";
import type { WaveformData } from "../../../lib/waveform";
import { fileService } from "../../../services/file.service";
import { mediaService } from "../../../services/media.service";
import { shareService } from "../../../services/share.service";
import { authMiddleware } from "../../auth";

export const mediaRoutes = new Elysia({ prefix: "/api" })
	.use(authMiddleware)
	.get(
		"/files/:id/thumbnail",
		async ({ params, user, query, set }) => {
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
					if (
						sharePath !== "" &&
						file.path !== sharePath &&
						!file.path.startsWith(`${sharePath}/`)
					) {
						set.status = 403;
						return { data: null, error: "Access denied" };
					}
				}
			} else if (!user && !config.PETREL_GUEST_ACCESS) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			const size = parseThumbnailSize(query.size);

			try {
				const result = await mediaService.getThumbnail(file, size);

				set.headers["Cache-Control"] = "max-age=31536000";
				return new Response(Bun.file(result.path));
			} catch (err) {
				if (err instanceof Error && err.message.includes("available for")) {
					set.status = 400;
					return { data: null, error: err.message };
				}
				return {
					data: null,
					error: err instanceof Error ? err.message : "Failed to generate thumbnail",
				};
			}
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			query: t.Object({
				size: t.Optional(t.String()),
			}),
			detail: {
				summary: "Get file thumbnail",
				description: "Returns a cached thumbnail for image and video files",
				tags: ["Files"],
			},
		},
	)
	.get(
		"/files/:id/sprite",
		async ({ params, user, query, set }) => {
			const file = await fileService.getById(params.id);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

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
					if (
						sharePath !== "" &&
						file.path !== sharePath &&
						!file.path.startsWith(`${sharePath}/`)
					) {
						set.status = 403;
						return { data: null, error: "Access denied" };
					}
				}
			} else if (!user && !config.PETREL_GUEST_ACCESS) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			try {
				const { spritePath } = await mediaService.getVideoSprite(file);

				set.headers["Cache-Control"] = "max-age=31536000";
				return new Response(Bun.file(spritePath));
			} catch (err) {
				if (err instanceof Error && err.message.includes("available for videos only")) {
					set.status = 400;
					return { data: null, error: err.message };
				}
				return {
					data: null,
					error: err instanceof Error ? err.message : "Failed to generate sprite",
				};
			}
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			detail: {
				summary: "Get video sprite sheet",
				description: "Returns a sprite sheet for video scrubbing preview",
				tags: ["Files"],
			},
		},
	)
	.get(
		"/files/:id/sprite/meta",
		async ({ params, user, query, set }): Promise<ApiResponse<SpriteMetadata>> => {
			const file = await fileService.getById(params.id);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

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
					if (
						sharePath !== "" &&
						file.path !== sharePath &&
						!file.path.startsWith(`${sharePath}/`)
					) {
						set.status = 403;
						return { data: null, error: "Access denied" };
					}
				}
			} else if (!user && !config.PETREL_GUEST_ACCESS) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			try {
				const { metadata } = await mediaService.getVideoSprite(file);

				return { data: metadata, error: null };
			} catch (err) {
				if (err instanceof Error && err.message.includes("available for videos only")) {
					set.status = 400;
					return { data: null, error: err.message };
				}
				return {
					data: null,
					error: err instanceof Error ? err.message : "Failed to get sprite metadata",
				};
			}
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			detail: {
				summary: "Get video sprite metadata",
				description: "Returns metadata for the sprite sheet (dimensions, interval)",
				tags: ["Files"],
			},
		},
	)
	.get(
		"/files/:id/waveform",
		async ({ params, user, query, set }): Promise<ApiResponse<WaveformData>> => {
			const file = await fileService.getById(params.id);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

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
					if (
						sharePath !== "" &&
						file.path !== sharePath &&
						!file.path.startsWith(`${sharePath}/`)
					) {
						set.status = 403;
						return { data: null, error: "Access denied" };
					}
				}
			} else if (!user && !config.PETREL_GUEST_ACCESS) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			try {
				const waveformData = await mediaService.getWaveformData(file);

				return { data: waveformData, error: null };
			} catch (err) {
				if (err instanceof Error && err.message.includes("available for audio files only")) {
					set.status = 400;
					return { data: null, error: err.message };
				}
				return {
					data: null,
					error: err instanceof Error ? err.message : "Failed to get waveform data",
				};
			}
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			detail: {
				summary: "Get audio waveform data",
				description: "Returns waveform sample data for audio visualization",
				tags: ["Files"],
			},
		},
	)
	.get(
		"/files/:id/waveform/image",
		async ({ params, user, query, set }) => {
			const file = await fileService.getById(params.id);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

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
					if (
						sharePath !== "" &&
						file.path !== sharePath &&
						!file.path.startsWith(`${sharePath}/`)
					) {
						set.status = 403;
						return { data: null, error: "Access denied" };
					}
				}
			} else if (!user && !config.PETREL_GUEST_ACCESS) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			try {
				const width = Math.min(Math.max(query.width ?? 800, 100), 2000);
				const height = Math.min(Math.max(query.height ?? 100, 50), 500);

				const imagePath = await mediaService.getWaveformImage(file, width, height);

				set.headers["Content-Type"] = "image/png";
				set.headers["Cache-Control"] = "max-age=31536000";
				return new Response(Bun.file(imagePath));
			} catch (err) {
				if (err instanceof Error && err.message.includes("available for audio files only")) {
					set.status = 400;
					return { data: null, error: err.message };
				}
				return {
					data: null,
					error: err instanceof Error ? err.message : "Failed to generate waveform image",
				};
			}
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
			query: t.Object({
				width: t.Optional(t.Number()),
				height: t.Optional(t.Number()),
			}),
			detail: {
				summary: "Get audio waveform image",
				description: "Returns a rendered waveform image for audio files",
				tags: ["Files"],
			},
		},
	);
