import type { File } from '@petrel/shared';
import { config } from '../config';
import {
  ensureDirectory,
  getAudioVariantDirectoryRelativePath,
  getAudioVariantRelativePath,
  pathExists,
  resolveStoragePath,
} from '../lib/storage';
import { transcodeAudioToOpus } from '../lib/ffmpeg';
import { fileService } from './file.service';

interface AudioStreamSource {
  absolutePath: string;
  mimeType: string;
  variant: 'original' | 'opus';
}

class AudioService {
  private inflightVariants = new Map<number, Promise<string | null>>();

  async getStreamSource(file: File): Promise<AudioStreamSource> {
    const originalPath = fileService.resolveDiskPath(file);

    if (!(await this.shouldUseOpusVariant(file))) {
      return { absolutePath: originalPath, mimeType: file.mimeType, variant: 'original' };
    }

    const variantPath = await this.ensureOpusVariant(file);
    if (!variantPath) {
      return { absolutePath: originalPath, mimeType: file.mimeType, variant: 'original' };
    }

    return { absolutePath: variantPath, mimeType: 'audio/opus', variant: 'opus' };
  }

  private async shouldUseOpusVariant(file: File): Promise<boolean> {
    if (!config.AUDIO_TRANSCODE_FLAC) {
      return false;
    }

    return file.mimeType.toLowerCase() === 'audio/flac';
  }

  private async ensureOpusVariant(file: File): Promise<string | null> {
    const existing = this.inflightVariants.get(file.id);
    if (existing) {
      return existing;
    }

    const promise = this.createOpusVariant(file)
      .catch(() => null)
      .finally(() => {
        this.inflightVariants.delete(file.id);
      });

    this.inflightVariants.set(file.id, promise);
    return promise;
  }

  private async createOpusVariant(file: File): Promise<string | null> {
    const relativePath = getAudioVariantRelativePath(file.id, 'opus');
    const absolutePath = resolveStoragePath(relativePath);

    if (await pathExists(absolutePath)) {
      return absolutePath;
    }

    const directory = getAudioVariantDirectoryRelativePath(file.id);
    await ensureDirectory(directory);

    await transcodeAudioToOpus({
      inputPath: fileService.resolveDiskPath(file),
      outputPath: absolutePath,
      bitrateKbps: config.AUDIO_OPUS_BITRATE_KBPS,
    });

    return absolutePath;
  }
}

export const audioService = new AudioService();
