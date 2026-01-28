import exifr from 'exifr';
import sharp from 'sharp';
import { parseFile } from 'music-metadata';
import type { AudioMetadata, ImageMetadata } from '@petrel/shared';

const DEFAULT_EXIF_OPTIONS = {
  tiff: true,
  ifd0: true,
  exif: true,
  gps: true,
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return null;
}

function toDateValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  return null;
}

function mapAudioMetadata(metadata: Awaited<ReturnType<typeof parseFile>>): AudioMetadata {
  const common = metadata.common;
  const format = metadata.format;

  return {
    duration: format.duration ?? 0,
    codec: format.codec ?? 'unknown',
    bitrate: format.bitrate ?? 0,
    sampleRate: format.sampleRate ?? 0,
    channels: format.numberOfChannels ?? 0,
    title: common.title ?? null,
    artist: common.artist ?? null,
    album: common.album ?? null,
    year: common.year ?? null,
    genre: common.genre?.[0] ?? null,
    albumArt: Boolean(common.picture && common.picture.length > 0),
  };
}

function mapImageMetadata(
  sharpMetadata: sharp.Metadata,
  exifData: Record<string, unknown> | null
): ImageMetadata {
  const latitude = toNumber(exifData?.latitude);
  const longitude = toNumber(exifData?.longitude);

  return {
    width: sharpMetadata.width ?? 0,
    height: sharpMetadata.height ?? 0,
    format: sharpMetadata.format ?? 'unknown',
    exif: exifData
      ? {
          make: toStringValue(exifData.Make),
          model: toStringValue(exifData.Model),
          lens: toStringValue(exifData.LensModel ?? exifData.Lens),
          dateTaken: toDateValue(exifData.DateTimeOriginal),
          exposureTime: toStringValue(exifData.ExposureTime),
          fNumber: toStringValue(exifData.FNumber),
          iso: toNumber(exifData.ISO),
          focalLength: toStringValue(exifData.FocalLength),
          gps: latitude !== null && longitude !== null ? { latitude, longitude } : null,
        }
      : null,
  };
}

export class MetadataService {
  async extractAudioMetadata(filePath: string): Promise<AudioMetadata> {
    const metadata = await parseFile(filePath);
    return mapAudioMetadata(metadata);
  }

  async extractImageMetadata(filePath: string): Promise<ImageMetadata> {
    const [sharpMetadata, exifData] = await Promise.all([
      sharp(filePath).metadata(),
      exifr.parse(filePath, DEFAULT_EXIF_OPTIONS),
    ]);

    return mapImageMetadata(sharpMetadata, exifData as Record<string, unknown> | null);
  }
}

export const metadataService = new MetadataService();