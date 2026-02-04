import { Elysia, t } from "elysia";
import { shareRateLimit, streamRateLimit } from "../../lib/rate-limit";
import { canRead } from "../../lib/route-helpers";
import { validateShareAccess } from "../../lib/share-validation";
import { resolveStoragePath } from "../../lib/storage";
import { fileService } from "../../services/file.service";
import { folderService } from "../../services/folder.service";
import { shareService } from "../../services/share.service";
import { streamService } from "../../services/stream.service";
import { transcodeQueue } from "../../services/transcode.service";
import { videoService } from "../../services/video.service";
import { authMiddleware } from "../auth";
import type { ApiResponse, StreamInfoResponse } from "./types";

const authenticatedStreamRoutes = new Elysia({ prefix: "/api/stream" })
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

			const filePath = fileService.resolveDiskPath(file);
			const streamInfo = await streamService.getStreamInfo(fileId, filePath);

			if (!streamInfo.available) {
				if (streamInfo.isTransmux) {
					// Trigger transmux asynchronously and return 202 immediately
					// Client will poll /info endpoint until stream is ready
					void streamService.generateTransmuxStream(fileId, filePath);
					set.status = 202;
					return { data: { processing: true }, error: null };
				}
				set.status = 202;
				return {
					data: { processing: true, message: "Stream not ready, transcode in progress" },
					error: null,
				};
			}

			const playlist = await streamService.getMasterPlaylist(fileId);
			if (!playlist) {
				set.status = 500;
				return { data: null, error: "Failed to generate playlist" };
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
				return { data: null, error: "Unauthorized" };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return { data: null, error: "Invalid file ID" };
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
					return { data: { processing: true }, error: null };
				}

				const playlistPath = await streamService.getQualityPlaylist(fileId, quality);

				if (!playlistPath) {
					set.status = 404;
					return { data: null, error: "Playlist not found" };
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
					return { data: null, error: "Segment not found" };
				}

				set.headers["Content-Type"] = "video/MP2T";
				set.headers["Cache-Control"] = "max-age=31536000";

				return Bun.file(segmentPath);
			}

			set.status = 400;
			return { data: null, error: "Invalid request" };
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
				return { data: null, error: "Unauthorized" };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			const subtitleId = Number.parseInt(params.subtitleId, 10);

			if (Number.isNaN(fileId) || Number.isNaN(subtitleId)) {
				set.status = 400;
				return { data: null, error: "Invalid ID" };
			}

			const subtitles = await videoService.getSubtitles(fileId);
			const subtitle = subtitles.find((s) => s.id === subtitleId);

			if (!subtitle) {
				set.status = 404;
				return { data: null, error: "Subtitle not found" };
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

// Share-aware streaming routes (public access with token validation)
const shareStreamRoutes = new Elysia({ prefix: "/api/stream/share" })
	.use(shareRateLimit)
	.get(
		"/:token/:fileId/info",
		async ({ params, query, set }): Promise<ApiResponse<StreamInfoResponse>> => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				const status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				set.status = status;
				return { data: null, error };
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

			// Verify file is accessible via this share
			if (share?.share.type === "folder") {
				const shareContent = await shareService.getShareContent(share?.share);
				if (!shareContent) {
					set.status = 400;
					return { data: null, error: "Invalid share" };
				}
				if (file.parentId === null) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
				const isInFolder = await folderService.isDescendantOf(
					file.parentId,
					(shareContent as { path: string }).path,
				);
				if (!isInFolder) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
			} else if (share?.share.type === "file" && share?.share.targetId !== fileId) {
				set.status = 403;
				return { data: null, error: "Access denied" };
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
				token: t.String(),
				fileId: t.String(),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/:token/:fileId/prepare",
		async ({
			params,
			query,
			set,
		}): Promise<
			ApiResponse<{ jobId: number | null; ready: boolean; firstSegmentUrl: string | null }>
		> => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				const status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				set.status = status;
				return { data: null, error };
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

			// Verify file is accessible via this share
			if (share?.share.type === "folder") {
				const shareContent = await shareService.getShareContent(share?.share);
				if (!shareContent) {
					set.status = 400;
					return { data: null, error: "Invalid share" };
				}
				if (file.parentId === null) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
				const isInFolder = await folderService.isDescendantOf(
					file.parentId,
					(shareContent as { path: string }).path,
				);
				if (!isInFolder) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
			} else if (share?.share.type === "file" && share?.share.targetId !== fileId) {
				set.status = 403;
				return { data: null, error: "Access denied" };
			}

			if (!file.mimeType.startsWith("video/")) {
				set.status = 400;
				return { data: null, error: "File is not a video" };
			}

			const filePath = fileService.resolveDiskPath(file);
			const streamInfo = await streamService.getStreamInfo(fileId, filePath);

			if (streamInfo.available) {
				const firstSegmentUrl = await streamService.getFirstSegmentUrl(fileId);
				return { data: { jobId: null, ready: true, firstSegmentUrl }, error: null };
			}

			if (streamInfo.isTransmux) {
				await streamService.generateTransmuxStream(fileId, filePath);
				const firstSegmentUrl = await streamService.getFirstSegmentUrl(fileId);
				return { data: { jobId: null, ready: true, firstSegmentUrl }, error: null };
			}

			const job = await transcodeQueue.queueTranscode(fileId);
			return { data: { jobId: job.id, ready: false, firstSegmentUrl: null }, error: null };
		},
		{
			params: t.Object({
				token: t.String(),
				fileId: t.String(),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/:token/:fileId/subtitles",
		async ({
			params,
			query,
			set,
		}): Promise<ApiResponse<Array<{ id: number; language: string; title: string | null }>>> => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				const status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				set.status = status;
				return { data: null, error };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return { data: null, error: "Invalid file ID" };
			}

			if (share?.share.type === "file" && share?.share.targetId !== fileId) {
				set.status = 403;
				return { data: null, error: "Access denied" };
			}

			const file = await fileService.getById(fileId);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			if (share?.share.type === "folder") {
				const shareContent = await shareService.getShareContent(share?.share);
				if (!shareContent || file.parentId === null) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
				const isInFolder = await folderService.isDescendantOf(
					file.parentId,
					(shareContent as { path: string }).path,
				);
				if (!isInFolder) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
			}

			const subtitles = await videoService.getSubtitles(fileId);
			return {
				data: subtitles.map((s) => ({ id: s.id, language: s.language, title: s.title })),
				error: null,
			};
		},
		{
			params: t.Object({
				token: t.String(),
				fileId: t.String(),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/:token/:fileId/subtitles/:subtitleId",
		async ({ params, query, set }) => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				const status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				set.status = status;
				return { data: null, error };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			const subtitleId = Number.parseInt(params.subtitleId, 10);
			if (Number.isNaN(fileId) || Number.isNaN(subtitleId)) {
				set.status = 400;
				return { data: null, error: "Invalid ID" };
			}

			if (share?.share.type === "file" && share?.share.targetId !== fileId) {
				set.status = 403;
				return { data: null, error: "Access denied" };
			}

			const file = await fileService.getById(fileId);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			if (share?.share.type === "folder") {
				const shareContent = await shareService.getShareContent(share?.share);
				if (!shareContent || file.parentId === null) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
				const isInFolder = await folderService.isDescendantOf(
					file.parentId,
					(shareContent as { path: string }).path,
				);
				if (!isInFolder) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
			}

			const subtitles = await videoService.getSubtitles(fileId);
			const subtitle = subtitles.find((s) => s.id === subtitleId);
			if (!subtitle) {
				set.status = 404;
				return { data: null, error: "Subtitle not found" };
			}

			const absolutePath = resolveStoragePath(subtitle.path);
			set.headers["Content-Type"] = "text/vtt";
			set.headers["Cache-Control"] = "max-age=31536000";
			return Bun.file(absolutePath);
		},
		{
			params: t.Object({
				token: t.String(),
				fileId: t.String(),
				subtitleId: t.String(),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/:token/:fileId/tracks",
		async ({
			params,
			query,
			set,
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
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				const status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				set.status = status;
				return { data: null, error };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return { data: null, error: "Invalid file ID" };
			}

			if (share?.share.type === "file" && share?.share.targetId !== fileId) {
				set.status = 403;
				return { data: null, error: "Access denied" };
			}

			const file = await fileService.getById(fileId);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			if (share?.share.type === "folder") {
				const shareContent = await shareService.getShareContent(share?.share);
				if (!shareContent || file.parentId === null) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
				const isInFolder = await folderService.isDescendantOf(
					file.parentId,
					(shareContent as { path: string }).path,
				);
				if (!isInFolder) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
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
				token: t.String(),
				fileId: t.String(),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/:token/:fileId/master.m3u8",
		async ({ params, query, set }) => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				const status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				set.status = status;
				return { data: null, error };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return { data: null, error: "Invalid file ID" };
			}

			// Verify file is accessible via this share
			const file = await fileService.getById(fileId);
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			// Check if file is within shared folder (for folder shares)
			if (share?.share.type === "folder") {
				const shareContent = await shareService.getShareContent(share?.share);
				if (!shareContent) {
					set.status = 400;
					return { data: null, error: "Invalid share" };
				}
				if (file.parentId === null) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
				const isInFolder = await folderService.isDescendantOf(
					file.parentId,
					(shareContent as { path: string }).path,
				);
				if (!isInFolder) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
			} else if (share?.share.type === "file" && share?.share.targetId !== fileId) {
				set.status = 403;
				return { data: null, error: "Access denied" };
			}

			if (!file.mimeType.startsWith("video/")) {
				set.status = 400;
				return { data: null, error: "File is not a video" };
			}

			const filePath = fileService.resolveDiskPath(file);
			const streamInfo = await streamService.getStreamInfo(fileId, filePath);

			if (!streamInfo.available) {
				if (streamInfo.isTransmux) {
					void streamService.generateTransmuxStream(fileId, filePath);
					set.status = 202;
					return { data: { processing: true }, error: null };
				}
				set.status = 202;
				return {
					data: { processing: true, message: "Stream not ready, transcode in progress" },
					error: null,
				};
			}

			const playlist = await streamService.getMasterPlaylist(fileId);
			if (!playlist) {
				set.status = 500;
				return { data: null, error: "Failed to generate playlist" };
			}

			set.headers["Content-Type"] = "application/vnd.apple.mpegurl";
			set.headers["Cache-Control"] = "no-cache";

			const password = query.password;
			const passwordQuery = password ? `?password=${encodeURIComponent(password)}` : "";

			let content = "";
			if (playlist.qualities.length > 0) {
				content = streamService.generateMasterPlaylistContent(
					fileId,
					playlist.qualities.map((q) => q.name),
				);
			} else {
				content = playlist.content;
			}

			// The master playlist references variant playlists relatively (e.g. 720p.m3u8)
			// Those will resolve under /api/stream/share/:token/:fileId/ automatically.
			// If the share is password-protected, append it to each playlist request.
			return passwordQuery ? content.replace(/\.m3u8/g, `.m3u8${passwordQuery}`) : content;
		},
		{
			params: t.Object({
				token: t.String(),
				fileId: t.String(),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/:token/:fileId/:playlist",
		async ({ params, query, set }) => {
			const { share, error } = await validateShareAccess(params.token, query.password);
			if (error) {
				const status = error === "Share not found" ? 404 : error === "Share expired" ? 410 : 401;
				set.status = status;
				return { data: null, error };
			}

			const fileId = Number.parseInt(params.fileId, 10);
			if (Number.isNaN(fileId)) {
				set.status = 400;
				return { data: null, error: "Invalid file ID" };
			}

			const playlistName = params.playlist;

			if (playlistName.endsWith(".m3u8")) {
				const quality = playlistName.replace(".m3u8", "");

				if (quality === "processing") {
					set.status = 202;
					set.headers["Content-Type"] = "application/vnd.apple.mpegurl";
					set.headers["Cache-Control"] = "no-cache";
					return { data: { processing: true }, error: null };
				}

				const playlistPath = await streamService.getQualityPlaylist(fileId, quality);

				if (!playlistPath) {
					set.status = 404;
					return { data: null, error: "Playlist not found" };
				}

				set.headers["Content-Type"] = "application/vnd.apple.mpegurl";
				set.headers["Cache-Control"] = "no-cache";

				const password = query.password;
				const passwordQuery = password ? `?password=${encodeURIComponent(password)}` : "";

				const content = await Bun.file(playlistPath).text();
				return content
					.replace(/segment_/g, `/api/stream/share/${params.token}/${fileId}/segment_`)
					.replace(/\.ts/g, `.ts${passwordQuery}`);
			}

			if (playlistName.startsWith("segment_") && playlistName.endsWith(".ts")) {
				const segmentPath = await streamService.getSegment(fileId, playlistName);

				if (!segmentPath) {
					set.status = 404;
					return { data: null, error: "Segment not found" };
				}

				set.headers["Content-Type"] = "video/MP2T";
				set.headers["Cache-Control"] = "max-age=31536000";

				return Bun.file(segmentPath);
			}

			set.status = 400;
			return { data: null, error: "Invalid request" };
		},
		{
			params: t.Object({
				token: t.String(),
				fileId: t.String(),
				playlist: t.String(),
			}),
			query: t.Object({
				password: t.Optional(t.String()),
			}),
		},
	);

export const streamRoutes = new Elysia().use(authenticatedStreamRoutes).use(shareStreamRoutes);
