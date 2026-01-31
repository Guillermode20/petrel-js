import { stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { extractFrame, generateSpriteSheet } from "./ffmpeg";
import { ensureDirectory, resolveStoragePath } from "./storage";

export type ThumbnailSize = "small" | "medium" | "large" | "blur";

const THUMBNAIL_SIZES: Record<ThumbnailSize, number> = {
	small: 256,
	medium: 512,
	large: 1024,
	blur: 32,
};

const SPRITE_CONFIG = {
	columns: 10,
	rows: 10,
	thumbWidth: 160,
	thumbHeight: 90,
};

export function getThumbnailDirectory(fileId: number): string {
	return path.posix.join(".thumbnails", fileId.toString());
}

export function getThumbnailPath(fileId: number, size: ThumbnailSize): string {
	return path.posix.join(getThumbnailDirectory(fileId), `${size}.webp`);
}

export function getVideoThumbnailPath(fileId: number, size: ThumbnailSize): string {
	return path.posix.join(getThumbnailDirectory(fileId), `video_${size}.webp`);
}

export function getSpritePath(fileId: number): string {
	return path.posix.join(getThumbnailDirectory(fileId), "sprite.webp");
}

export function getSpriteMetaPath(fileId: number): string {
	return path.posix.join(getThumbnailDirectory(fileId), "sprite.json");
}

async function fileExists(absolutePath: string): Promise<boolean> {
	const statResult = await stat(absolutePath).catch(() => null);
	return statResult !== null;
}

export async function generateImageThumbnail(
	sourceAbsolutePath: string,
	fileId: number,
	size: ThumbnailSize,
): Promise<string> {
	const thumbnailRelative = getThumbnailPath(fileId, size);
	const thumbnailAbsolute = resolveStoragePath(thumbnailRelative);

	if (await fileExists(thumbnailAbsolute)) {
		return thumbnailAbsolute;
	}

	await ensureDirectory(getThumbnailDirectory(fileId));

	const pipeline = sharp(sourceAbsolutePath).resize({
		width: THUMBNAIL_SIZES[size],
		height: THUMBNAIL_SIZES[size],
		fit: "inside",
	});

	if (size === "blur") {
		pipeline.blur(8);
	}

	await pipeline.webp({ quality: 80 }).toFile(thumbnailAbsolute);

	return thumbnailAbsolute;
}

export async function generateVideoThumbnail(
	sourceAbsolutePath: string,
	fileId: number,
	size: ThumbnailSize,
	duration: number,
): Promise<string> {
	const thumbnailRelative = getVideoThumbnailPath(fileId, size);
	const thumbnailAbsolute = resolveStoragePath(thumbnailRelative);

	if (await fileExists(thumbnailAbsolute)) {
		return thumbnailAbsolute;
	}

	await ensureDirectory(getThumbnailDirectory(fileId));

	const timestamp = Math.max(0, Math.min(duration * 0.1, duration - 1));
	const tempFramePath = resolveStoragePath(
		path.posix.join(getThumbnailDirectory(fileId), `temp_frame_${size}.png`),
	);

	await extractFrame({
		inputPath: sourceAbsolutePath,
		outputPath: tempFramePath,
		timestamp,
		width: THUMBNAIL_SIZES[size],
		height: THUMBNAIL_SIZES[size],
	});

	const pipeline = sharp(tempFramePath);

	if (size === "blur") {
		pipeline.blur(8);
	}

	await pipeline.webp({ quality: 80 }).toFile(thumbnailAbsolute);

	await Bun.file(tempFramePath)
		.delete()
		.catch(() => null);

	return thumbnailAbsolute;
}

export interface SpriteMetadata {
	columns: number;
	rows: number;
	thumbWidth: number;
	thumbHeight: number;
	interval: number;
	totalFrames: number;
}

export async function generateVideoSprite(
	sourceAbsolutePath: string,
	fileId: number,
	duration: number,
): Promise<{ spritePath: string; metadata: SpriteMetadata }> {
	const spriteRelative = getSpritePath(fileId);
	const spriteAbsolute = resolveStoragePath(spriteRelative);
	const spriteMetaRelative = getSpriteMetaPath(fileId);
	const spriteMetaAbsolute = resolveStoragePath(spriteMetaRelative);

	if (await fileExists(spriteAbsolute)) {
		const existingMeta = await Bun.file(spriteMetaAbsolute)
			.json()
			.catch(() => null);
		if (existingMeta) {
			return { spritePath: spriteAbsolute, metadata: existingMeta as SpriteMetadata };
		}
	}

	await ensureDirectory(getThumbnailDirectory(fileId));

	const tempSpritePath = resolveStoragePath(
		path.posix.join(getThumbnailDirectory(fileId), "temp_sprite.jpg"),
	);

	await generateSpriteSheet({
		inputPath: sourceAbsolutePath,
		outputPath: tempSpritePath,
		duration,
		columns: SPRITE_CONFIG.columns,
		rows: SPRITE_CONFIG.rows,
		thumbWidth: SPRITE_CONFIG.thumbWidth,
		thumbHeight: SPRITE_CONFIG.thumbHeight,
	});

	await sharp(tempSpritePath).webp({ quality: 75 }).toFile(spriteAbsolute);

	await Bun.file(tempSpritePath)
		.delete()
		.catch(() => null);

	const totalFrames = SPRITE_CONFIG.columns * SPRITE_CONFIG.rows;
	const metadata: SpriteMetadata = {
		columns: SPRITE_CONFIG.columns,
		rows: SPRITE_CONFIG.rows,
		thumbWidth: SPRITE_CONFIG.thumbWidth,
		thumbHeight: SPRITE_CONFIG.thumbHeight,
		interval: duration / totalFrames,
		totalFrames,
	};

	await Bun.write(spriteMetaAbsolute, JSON.stringify(metadata, null, 2));

	return { spritePath: spriteAbsolute, metadata };
}

export async function generateAllImageThumbnails(
	sourceAbsolutePath: string,
	fileId: number,
): Promise<void> {
	const sizes: ThumbnailSize[] = ["small", "medium", "large", "blur"];
	await Promise.all(sizes.map((size) => generateImageThumbnail(sourceAbsolutePath, fileId, size)));
}

export async function generateAllVideoThumbnails(
	sourceAbsolutePath: string,
	fileId: number,
	duration: number,
): Promise<void> {
	const sizes: ThumbnailSize[] = ["small", "medium", "large", "blur"];
	await Promise.all(
		sizes.map((size) => generateVideoThumbnail(sourceAbsolutePath, fileId, size, duration)),
	);
}
