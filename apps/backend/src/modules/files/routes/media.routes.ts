import { Elysia, t } from "elysia";
import { parseThumbnailSize } from "../../../lib/route-helpers";
import type { SpriteMetadata } from "../../../lib/thumbnails";
import type { WaveformData } from "../../../lib/waveform";
import { fileService } from "../../../services/file.service";
import { mediaService } from "../../../services/media.service";
import { fileAccessGuard } from "../guards";

export const mediaRoutes = new Elysia({ prefix: "/api" })
	.use(fileAccessGuard)
	.get(
		"/files/:id/thumbnail",
		async ({ params, query, set }) => {
			const file = await fileService.getById(params.id);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
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
				throw err;
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
		async ({ params, set }) => {
			const file = await fileService.getById(params.id);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
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
				throw err;
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
		async ({ params, set }): Promise<{ data: SpriteMetadata | null; error: string | null }> => {
			const file = await fileService.getById(params.id);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			try {
				const { metadata } = await mediaService.getVideoSprite(file);

				return { data: metadata, error: null };
			} catch (err) {
				if (err instanceof Error && err.message.includes("available for videos only")) {
					set.status = 400;
					return { data: null, error: err.message };
				}
				throw err;
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
		async ({ params, set }): Promise<{ data: WaveformData | null; error: string | null }> => {
			const file = await fileService.getById(params.id);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			try {
				const waveformData = await mediaService.getWaveformData(file);

				return { data: waveformData, error: null };
			} catch (err) {
				if (err instanceof Error && err.message.includes("available for audio files only")) {
					set.status = 400;
					return { data: null, error: err.message };
				}
				throw err;
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
		async ({ params, query, set }) => {
			const file = await fileService.getById(params.id);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
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
				throw err;
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
