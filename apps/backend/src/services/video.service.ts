import path from "node:path";
import type { Subtitle, TranscodeJob, VideoMetadata, VideoTrack } from "@petrel/shared";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { subtitles, transcodeJobs, videoTracks } from "../../db/schema";
import {
	assessTranscodeNeeds,
	extractSubtitle,
	type FFProbeResult,
	parseVideoMetadata,
	probeFile,
	type TranscodeAssessment,
} from "../lib/ffmpeg";
import { ensureDirectory, resolveStoragePath } from "../lib/storage";
import {
	generateAllVideoThumbnails,
	generateVideoSprite,
	type SpriteMetadata,
} from "../lib/thumbnails";

function getHlsDirectory(fileId: number): string {
	return path.posix.join(".hls", fileId.toString());
}

function getSubtitleDirectory(fileId: number): string {
	return path.posix.join(".subtitles", fileId.toString());
}

export class VideoService {
	async extractMetadata(filePath: string): Promise<VideoMetadata> {
		const probeResult = await probeFile(filePath);
		return parseVideoMetadata(probeResult);
	}

	async analyzeFile(filePath: string): Promise<{
		metadata: VideoMetadata;
		assessment: TranscodeAssessment;
		probeResult: FFProbeResult;
	}> {
		const probeResult = await probeFile(filePath);
		const metadata = parseVideoMetadata(probeResult);
		const assessment = assessTranscodeNeeds(probeResult);
		return { metadata, assessment, probeResult };
	}

	async saveVideoTracks(fileId: number, probeResult: FFProbeResult): Promise<void> {
		const tracksToInsert = probeResult.streams
			.filter(
				(s) => s.codec_type === "video" || s.codec_type === "audio" || s.codec_type === "subtitle",
			)
			.map((stream) => ({
				fileId,
				trackType: stream.codec_type,
				codec: stream.codec_name,
				language: stream.tags?.language ?? null,
				index: stream.index,
				title: stream.tags?.title ?? null,
			}));

		if (tracksToInsert.length > 0) {
			await db.delete(videoTracks).where(eq(videoTracks.fileId, fileId));
			await db.insert(videoTracks).values(tracksToInsert);
		}
	}

	async getVideoTracks(fileId: number): Promise<VideoTrack[]> {
		const rows = await db.query.videoTracks.findMany({
			where: eq(videoTracks.fileId, fileId),
		});

		return rows.map((row) => ({
			id: row.id,
			fileId: row.fileId,
			trackType: row.trackType as VideoTrack["trackType"],
			codec: row.codec,
			language: row.language,
			index: row.index,
			title: row.title,
		}));
	}

	async extractAndSaveSubtitles(
		fileId: number,
		filePath: string,
		probeResult: FFProbeResult,
	): Promise<Subtitle[]> {
		const subtitleStreams = probeResult.streams.filter((s) => s.codec_type === "subtitle");
		if (subtitleStreams.length === 0) return [];

		const subtitleDir = getSubtitleDirectory(fileId);
		await ensureDirectory(subtitleDir);

		const savedSubtitles: Subtitle[] = [];

		for (const stream of subtitleStreams) {
			const language = stream.tags?.language ?? "und";
			const outputFileName = `${stream.index}_${language}.vtt`;
			const outputRelativePath = path.posix.join(subtitleDir, outputFileName);
			const outputAbsolutePath = resolveStoragePath(outputRelativePath);

			try {
				await extractSubtitle({
					inputPath: filePath,
					outputPath: outputAbsolutePath,
					streamIndex: stream.index,
				});

				const inserted = await db
					.insert(subtitles)
					.values({
						fileId,
						language,
						path: outputRelativePath,
						format: "webvtt",
						title: stream.tags?.title ?? null,
					})
					.returning();

				if (inserted[0]) {
					savedSubtitles.push({
						id: inserted[0].id,
						fileId: inserted[0].fileId,
						language: inserted[0].language,
						path: inserted[0].path,
						format: inserted[0].format,
						title: inserted[0].title,
					});
				}
			} catch {
				// Some subtitle formats may not be convertible, skip them
			}
		}

		return savedSubtitles;
	}

	async getSubtitles(fileId: number): Promise<Subtitle[]> {
		const rows = await db.query.subtitles.findMany({
			where: eq(subtitles.fileId, fileId),
		});

		return rows.map((row) => ({
			id: row.id,
			fileId: row.fileId,
			language: row.language,
			path: row.path,
			format: row.format,
			title: row.title,
		}));
	}

	async generateThumbnails(fileId: number, filePath: string, duration: number): Promise<void> {
		await generateAllVideoThumbnails(filePath, fileId, duration);
	}

	async generateSprite(
		fileId: number,
		filePath: string,
		duration: number,
	): Promise<{ spritePath: string; metadata: SpriteMetadata }> {
		return generateVideoSprite(filePath, fileId, duration);
	}

	async getHlsDirectory(fileId: number): Promise<string> {
		const hlsDir = getHlsDirectory(fileId);
		await ensureDirectory(hlsDir);
		return resolveStoragePath(hlsDir);
	}

	async getTranscodeJob(fileId: number): Promise<TranscodeJob | null> {
		const row = await db.query.transcodeJobs.findFirst({
			where: eq(transcodeJobs.fileId, fileId),
			orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
		});

		if (!row) return null;

		return {
			id: row.id,
			fileId: row.fileId,
			status: row.status as TranscodeJob["status"],
			progress: row.progress,
			outputPath: row.outputPath,
			createdAt: row.createdAt,
			completedAt: row.completedAt,
			error: row.error,
		};
	}

	async processVideoFile(fileId: number, filePath: string): Promise<VideoMetadata> {
		const { metadata, probeResult } = await this.analyzeFile(filePath);

		await this.saveVideoTracks(fileId, probeResult);
		await this.extractAndSaveSubtitles(fileId, filePath, probeResult);

		if (metadata.duration > 0) {
			await this.generateThumbnails(fileId, filePath, metadata.duration);
		}

		return metadata;
	}
}

export const videoService = new VideoService();
