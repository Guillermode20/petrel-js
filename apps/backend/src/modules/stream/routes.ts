import { Elysia, t } from "elysia";
import { config } from "../../config";
import { streamRateLimit } from "../../lib/rate-limit";
import { resolveStoragePath } from "../../lib/storage";
import { fileService } from "../../services/file.service";
import { streamService } from "../../services/stream.service";
import { transcodeQueue } from "../../services/transcode.service";
import { videoService } from "../../services/video.service";
import { authMiddleware } from "../auth";
import type { ApiResponse, StreamInfoResponse } from "./types";

const GUEST_ACCESS_ENABLED = config.PETREL_GUEST_ACCESS;

function canRead(user: unknown): boolean {
	return Boolean(user) || GUEST_ACCESS_ENABLED;
}

export const streamRoutes = new Elysia({ prefix: "/api/stream" })
	.use(authMiddleware)
	.use(streamRateLimit)
	.get(
		"/:fileId/info",
		async ({ params, set, user }): Promise<ApiResponse<StreamInfoResponse>> => {
			if (!canRead(user)) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return { data: null, error: "Invalid file ID" };
			}

			const file = await fileService.getById(fileId);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			if (!file.mimeType.startsWith("video/")) {
				set.status = 400;
				return { data: null, error: "File is not a video" };
			}

			const filePath = fileService.resolveDiskPath(file);
			const streamInfo = await streamService.getStreamInfo(fileId, filePath);
			const transcodeJob = await transcodeQueue.getJobByFileId(fileId);

			return {
				data: {
					available: streamInfo.available,
					qualities: streamInfo.qualities,
					isTransmux: streamInfo.isTransmux,
					needsTranscode: streamInfo.needsTranscode,
					transcodeJob,
				},
				error: null,
			};
		},
		{
			params: t.Object({
				fileId: t.String(),
			}),
		},
	)
	.post(
		"/:fileId/prepare",
		async ({
			params,
			set,
			user,
		}): Promise<
			ApiResponse<{ jobId: number | null; ready: boolean; firstSegmentUrl: string | null }>
		> => {
			if (!canRead(user)) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return { data: null, error: "Invalid file ID" };
			}

			const file = await fileService.getById(fileId);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			if (!file.mimeType.startsWith("video/")) {
				set.status = 400;
				return { data: null, error: "File is not a video" };
			}

			const filePath = fileService.resolveDiskPath(file);
			const streamInfo = await streamService.getStreamInfo(fileId, filePath);

			if (streamInfo.available) {
				// Stream is ready - get first segment URL for preloading
				const firstSegmentUrl = await streamService.getFirstSegmentUrl(fileId);
				return { data: { jobId: null, ready: true, firstSegmentUrl }, error: null };
			}

			if (streamInfo.isTransmux) {
				await streamService.generateTransmuxStream(fileId, filePath);
				// After transmux, get the first segment URL
				const firstSegmentUrl = await streamService.getFirstSegmentUrl(fileId);
				return { data: { jobId: null, ready: true, firstSegmentUrl }, error: null };
			}

			const job = await transcodeQueue.queueTranscode(fileId);
			return { data: { jobId: job.id, ready: false, firstSegmentUrl: null }, error: null };
		},
		{
			params: t.Object({
				fileId: t.String(),
			}),
		},
	)
	.get(
		"/:fileId/master.m3u8",
		async ({ params, query, set, user }) => {
			if (!canRead(user)) {
				set.status = 401;
				return "#EXTM3U\n# Unauthorized";
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return "#EXTM3U\n# Invalid file ID";
			}

			const file = await fileService.getById(fileId);
			if (!file) {
				set.status = 404;
				return "#EXTM3U\n# File not found";
			}

			const filePath = fileService.resolveDiskPath(file);
			const streamInfo = await streamService.getStreamInfo(fileId, filePath);

			if (!streamInfo.available) {
				if (streamInfo.isTransmux) {
					// Trigger transmux asynchronously and return 202 immediately
					// Client will poll /info endpoint until stream is ready
					void streamService.generateTransmuxStream(fileId, filePath);
					set.status = 202;
					return "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\n/processing.m3u8";
				}
				set.status = 202;
				return "#EXTM3U\n# Stream not ready, transcode in progress";
			}

			const playlist = await streamService.getMasterPlaylist(fileId);
			if (!playlist) {
				set.status = 500;
				return "#EXTM3U\n# Failed to generate playlist";
			}

			set.headers["Content-Type"] = "application/vnd.apple.mpegurl";
			set.headers["Cache-Control"] = "no-cache";

			const token = query.token;
			const tokenQuery = token ? `?token=${token}` : "";

			let content = "";
			if (playlist.qualities.length > 0) {
				content = streamService.generateMasterPlaylistContent(
					fileId,
					playlist.qualities.map((q) => q.name),
				);
			} else {
				content = playlist.content;
			}

			if (tokenQuery) {
				// Append token to all .m3u8 lines in the master playlist
				return content.replace(/\.m3u8/g, `.m3u8${tokenQuery}`);
			}

			return content;
		},
		{
			params: t.Object({
				fileId: t.String(),
			}),
		},
	)
	.get(
		"/:fileId/:playlist",
		async ({ params, query, set, user }) => {
			if (!canRead(user)) {
				set.status = 401;
				return "#EXTM3U\n# Unauthorized";
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return "#EXTM3U\n# Invalid file ID";
			}

			const playlistName = params.playlist;
			const token = query.token;
			const tokenQuery = token ? `?token=${token}` : "";

			if (playlistName.endsWith(".m3u8")) {
				const quality = playlistName.replace(".m3u8", "");

				// Handle processing placeholder playlist
				if (quality === "processing") {
					set.status = 202;
					set.headers["Content-Type"] = "application/vnd.apple.mpegurl";
					set.headers["Cache-Control"] = "no-cache";
					return "#EXTM3U\n# Stream is being prepared, please wait...";
				}

				const playlistPath = await streamService.getQualityPlaylist(fileId, quality);

				if (!playlistPath) {
					set.status = 404;
					return "#EXTM3U\n# Playlist not found";
				}

				set.headers["Content-Type"] = "application/vnd.apple.mpegurl";
				set.headers["Cache-Control"] = "no-cache";

				const content = await Bun.file(playlistPath).text();
				return content
					.replace(/segment_/g, `/api/stream/${fileId}/segment_`)
					.replace(/\.ts/g, `.ts${tokenQuery}`);
			}

			if (playlistName.endsWith(".ts")) {
				const segmentPath = await streamService.getSegment(fileId, playlistName);

				if (!segmentPath) {
					set.status = 404;
					return "Segment not found";
				}

				set.headers["Content-Type"] = "video/MP2T";
				set.headers["Cache-Control"] = "max-age=31536000";

				return Bun.file(segmentPath);
			}

			set.status = 400;
			return "Invalid request";
		},
		{
			params: t.Object({
				fileId: t.String(),
				playlist: t.String(),
			}),
		},
	)
	.get(
		"/:fileId/subtitles",
		async ({
			params,
			set,
			user,
		}): Promise<ApiResponse<Array<{ id: number; language: string; title: string | null }>>> => {
			if (!canRead(user)) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return { data: null, error: "Invalid file ID" };
			}

			const subtitles = await videoService.getSubtitles(fileId);

			return {
				data: subtitles.map((s) => ({
					id: s.id,
					language: s.language,
					title: s.title,
				})),
				error: null,
			};
		},
		{
			params: t.Object({
				fileId: t.String(),
			}),
		},
	)
	.get(
		"/:fileId/subtitles/:subtitleId",
		async ({ params, set, user }) => {
			if (!canRead(user)) {
				set.status = 401;
				return "Unauthorized";
			}

			const fileId = Number.parseInt(params.fileId, 10);
			const subtitleId = Number.parseInt(params.subtitleId, 10);

			if (Number.isNaN(fileId) || Number.isNaN(subtitleId)) {
				set.status = 400;
				return "Invalid ID";
			}

			const subtitles = await videoService.getSubtitles(fileId);
			const subtitle = subtitles.find((s) => s.id === subtitleId);

			if (!subtitle) {
				set.status = 404;
				return "Subtitle not found";
			}

			const absolutePath = resolveStoragePath(subtitle.path);

			set.headers["Content-Type"] = "text/vtt";
			set.headers["Cache-Control"] = "max-age=31536000";

			return Bun.file(absolutePath);
		},
		{
			params: t.Object({
				fileId: t.String(),
				subtitleId: t.String(),
			}),
		},
	)
	.get(
		"/:fileId/tracks",
		async ({
			params,
			set,
			user,
		}): Promise<
			ApiResponse<
				Array<{
					index: number;
					type: string;
					codec: string;
					language: string | null;
					title: string | null;
				}>
			>
		> => {
			if (!canRead(user)) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return { data: null, error: "Invalid file ID" };
			}

			const tracks = await videoService.getVideoTracks(fileId);

			return {
				data: tracks.map((t) => ({
					index: t.index,
					type: t.trackType,
					codec: t.codec,
					language: t.language,
					title: t.title,
				})),
				error: null,
			};
		},
		{
			params: t.Object({
				fileId: t.String(),
			}),
		},
	);
