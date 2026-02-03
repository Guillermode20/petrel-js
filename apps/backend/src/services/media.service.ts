import type { File } from "@petrel/shared";
import {
	generateImageThumbnail,
	generateVideoSprite,
	generateVideoThumbnail,
	type SpriteMetadata,
	type ThumbnailSize,
} from "../lib/thumbnails";
import { generateWaveformData, generateWaveformImage, type WaveformData } from "../lib/waveform";
import { fileService } from "./file.service";

export interface ThumbnailResult {
	path: string;
	contentType: string;
}

export interface SpriteResult {
	spritePath: string;
	metadata: SpriteMetadata;
}

export class MediaService {
	async getThumbnail(file: File, size: ThumbnailSize): Promise<ThumbnailResult> {
		const filePath = fileService.resolveDiskPath(file);

		if (file.mimeType.startsWith("image/")) {
			const thumbnailPath = await generateImageThumbnail(filePath, file.id, size);
			return { path: thumbnailPath, contentType: "image/webp" };
		}

		if (file.mimeType.startsWith("video/")) {
			const metadata = file.metadata as { duration?: number } | undefined;
			const duration = metadata?.duration ?? 60;
			const thumbnailPath = await generateVideoThumbnail(filePath, file.id, size, duration);
			return { path: thumbnailPath, contentType: "image/webp" };
		}

		throw new Error("Thumbnail available for images and videos only");
	}

	async getVideoSprite(file: File): Promise<SpriteResult> {
		if (!file.mimeType.startsWith("video/")) {
			throw new Error("Sprite available for videos only");
		}

		const metadata = file.metadata as { duration?: number } | undefined;
		const duration = metadata?.duration ?? 60;
		const filePath = fileService.resolveDiskPath(file);
		const { spritePath, metadata: spriteMeta } = await generateVideoSprite(
			filePath,
			file.id,
			duration,
		);

		return { spritePath, metadata: spriteMeta };
	}

	async getWaveformData(file: File): Promise<WaveformData> {
		if (!file.mimeType.startsWith("audio/")) {
			throw new Error("Waveform available for audio files only");
		}

		const filePath = fileService.resolveDiskPath(file);
		return generateWaveformData(filePath, file.id);
	}

	async getWaveformImage(file: File, width: number, height: number): Promise<string> {
		if (!file.mimeType.startsWith("audio/")) {
			throw new Error("Waveform available for audio files only");
		}

		const filePath = fileService.resolveDiskPath(file);
		return generateWaveformImage(filePath, file.id, width, height);
	}
}

export const mediaService = new MediaService();
