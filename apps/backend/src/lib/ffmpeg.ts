import path from 'node:path';
import type { VideoMetadata } from '@petrel/shared';

export interface FFProbeStream {
  index: number;
  codec_type: 'video' | 'audio' | 'subtitle';
  codec_name: string;
  codec_long_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  bit_rate?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  tags?: {
    language?: string;
    title?: string;
  };
}

export interface FFProbeFormat {
  filename: string;
  duration: string;
  size: string;
  bit_rate: string;
  format_name: string;
  format_long_name: string;
}

export interface FFProbeResult {
  streams: FFProbeStream[];
  format: FFProbeFormat;
}

const WEB_COMPATIBLE_VIDEO_CODECS = ['h264', 'hevc', 'h265', 'vp9', 'av1'];
const WEB_COMPATIBLE_AUDIO_CODECS = ['aac', 'mp3', 'opus', 'vorbis', 'flac'];

function parseFrameRate(frameRateStr: string | undefined): number {
  if (!frameRateStr) return 0;
  const parts = frameRateStr.split('/');
  if (parts.length === 2 && parts[0] && parts[1]) {
    const num = Number.parseFloat(parts[0]);
    const den = Number.parseFloat(parts[1]);
    if (den !== 0) return num / den;
  }
  return Number.parseFloat(frameRateStr) || 0;
}

async function runCommand(command: string, args: string[]): Promise<string> {
  const proc = Bun.spawn([command, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Command failed with code ${exitCode}: ${stderr}`);
  }

  return stdout;
}

export async function probeFile(filePath: string): Promise<FFProbeResult> {
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ];

  const output = await runCommand('ffprobe', args);
  return JSON.parse(output) as FFProbeResult;
}

export function parseVideoMetadata(probeResult: FFProbeResult): VideoMetadata {
  const videoStream = probeResult.streams.find((s) => s.codec_type === 'video');
  const audioStreams = probeResult.streams.filter((s) => s.codec_type === 'audio');
  const subtitleStreams = probeResult.streams.filter((s) => s.codec_type === 'subtitle');

  const duration = Number.parseFloat(probeResult.format.duration) || 0;
  const bitrate = Number.parseInt(probeResult.format.bit_rate, 10) || 0;

  return {
    duration,
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    codec: videoStream?.codec_name ?? 'unknown',
    bitrate,
    fps: parseFrameRate(videoStream?.avg_frame_rate ?? videoStream?.r_frame_rate),
    audioTracks: audioStreams.map((stream) => ({
      codec: stream.codec_name,
      language: stream.tags?.language ?? null,
      channels: stream.channels ?? 2,
    })),
    subtitles: subtitleStreams.map((stream) => ({
      language: stream.tags?.language ?? 'und',
      format: stream.codec_name,
    })),
  };
}

export interface TranscodeAssessment {
  canTransmux: boolean;
  needsVideoTranscode: boolean;
  needsAudioTranscode: boolean;
  videoCodec: string;
  audioCodec: string | null;
  reason: string;
}

export function assessTranscodeNeeds(probeResult: FFProbeResult): TranscodeAssessment {
  const videoStream = probeResult.streams.find((s) => s.codec_type === 'video');
  const audioStream = probeResult.streams.find((s) => s.codec_type === 'audio');

  const videoCodec = videoStream?.codec_name ?? 'unknown';
  const audioCodec = audioStream?.codec_name ?? null;

  const videoWebCompatible = WEB_COMPATIBLE_VIDEO_CODECS.includes(videoCodec.toLowerCase());
  const audioWebCompatible = audioCodec === null || WEB_COMPATIBLE_AUDIO_CODECS.includes(audioCodec.toLowerCase());

  const canTransmux = videoWebCompatible && audioWebCompatible;

  let reason = '';
  if (!videoWebCompatible) {
    reason = `Video codec '${videoCodec}' requires transcoding`;
  } else if (!audioWebCompatible) {
    reason = `Audio codec '${audioCodec}' requires transcoding`;
  } else {
    reason = 'File is web-compatible, can transmux directly';
  }

  return {
    canTransmux,
    needsVideoTranscode: !videoWebCompatible,
    needsAudioTranscode: !audioWebCompatible,
    videoCodec,
    audioCodec,
    reason,
  };
}

export interface ExtractFrameOptions {
  inputPath: string;
  outputPath: string;
  timestamp: number;
  width?: number;
  height?: number;
}

export async function extractFrame(options: ExtractFrameOptions): Promise<void> {
  const { inputPath, outputPath, timestamp, width, height } = options;

  const args = [
    '-ss', timestamp.toString(),
    '-i', inputPath,
    '-vframes', '1',
    '-y',
  ];

  if (width && height) {
    args.push('-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease`);
  }

  args.push(outputPath);

  await runCommand('ffmpeg', args);
}

export interface GenerateSpriteOptions {
  inputPath: string;
  outputPath: string;
  duration: number;
  columns: number;
  rows: number;
  thumbWidth: number;
  thumbHeight: number;
}

export async function generateSpriteSheet(options: GenerateSpriteOptions): Promise<void> {
  const { inputPath, outputPath, duration, columns, rows, thumbWidth, thumbHeight } = options;

  const totalFrames = columns * rows;
  const interval = duration / totalFrames;

  const args = [
    '-i', inputPath,
    '-vf', `fps=1/${interval},scale=${thumbWidth}:${thumbHeight},tile=${columns}x${rows}`,
    '-frames:v', '1',
    '-y',
    outputPath,
  ];

  await runCommand('ffmpeg', args);
}

export interface ExtractSubtitleOptions {
  inputPath: string;
  outputPath: string;
  streamIndex: number;
}

export async function extractSubtitle(options: ExtractSubtitleOptions): Promise<void> {
  const { inputPath, outputPath, streamIndex } = options;

  const args = [
    '-i', inputPath,
    '-map', `0:${streamIndex}`,
    '-c:s', 'webvtt',
    '-y',
    outputPath,
  ];

  await runCommand('ffmpeg', args);
}

export interface TranscodeOptions {
  inputPath: string;
  outputDir: string;
  quality: '1080p' | '720p' | '480p';
  onProgress?: (percent: number) => void;
}

function getTranscodeParams(quality: TranscodeOptions['quality']): { width: number; height: number; bitrate: string } {
  switch (quality) {
    case '1080p':
      return { width: 1920, height: 1080, bitrate: '5M' };
    case '720p':
      return { width: 1280, height: 720, bitrate: '2.5M' };
    case '480p':
      return { width: 854, height: 480, bitrate: '1M' };
    default:
      return { width: 1280, height: 720, bitrate: '2.5M' };
  }
}

export async function transcodeToHLS(options: TranscodeOptions): Promise<string> {
  const { inputPath, outputDir, quality, onProgress } = options;
  const params = getTranscodeParams(quality);

  const playlistPath = path.join(outputDir, `${quality}.m3u8`);
  const segmentPattern = path.join(outputDir, `${quality}_%03d.ts`);

  const args = [
    'ffmpeg',
    '-i', inputPath,
    '-vf', `scale=${params.width}:${params.height}:force_original_aspect_ratio=decrease,pad=${params.width}:${params.height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-b:v', params.bitrate,
    '-maxrate', params.bitrate,
    '-bufsize', `${Number.parseInt(params.bitrate, 10) * 2}M`,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '48000',
    '-hls_time', '6',
    '-hls_list_size', '0',
    '-hls_segment_filename', segmentPattern,
    '-progress', 'pipe:1',
    '-y',
    playlistPath,
  ];

  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let duration = 0;

  const stderrReader = async (): Promise<void> => {
    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const output = decoder.decode(value);
      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
      if (durationMatch && durationMatch[1] && durationMatch[2] && durationMatch[3]) {
        const hours = Number.parseInt(durationMatch[1], 10);
        const minutes = Number.parseInt(durationMatch[2], 10);
        const seconds = Number.parseInt(durationMatch[3], 10);
        duration = hours * 3600 + minutes * 60 + seconds;
      }
    }
  };

  const stdoutReader = async (): Promise<void> => {
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const output = decoder.decode(value);
      const timeMatch = output.match(/out_time_us=(\d+)/);
      if (timeMatch && timeMatch[1] && duration > 0 && onProgress) {
        const currentTime = Number.parseInt(timeMatch[1], 10) / 1_000_000;
        const percent = Math.min(100, Math.round((currentTime / duration) * 100));
        onProgress(percent);
      }
    }
  };

  await Promise.all([stderrReader(), stdoutReader()]);
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Transcode failed with code ${exitCode}`);
  }

  return playlistPath;
}

export interface TransmuxToHLSOptions {
  inputPath: string;
  outputDir: string;
}

export async function transmuxToHLS(options: TransmuxToHLSOptions): Promise<string> {
  const { inputPath, outputDir } = options;

  const playlistPath = path.join(outputDir, 'master.m3u8');
  const segmentPattern = path.join(outputDir, 'segment_%03d.ts');

  const args = [
    '-i', inputPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-hls_time', '6',
    '-hls_list_size', '0',
    '-hls_segment_filename', segmentPattern,
    '-y',
    playlistPath,
  ];

  await runCommand('ffmpeg', args);
  return playlistPath;
}

export interface TranscodeAudioOptions {
  inputPath: string;
  outputPath: string;
  bitrateKbps: number;
}

export async function transcodeAudioToOpus(options: TranscodeAudioOptions): Promise<void> {
  const { inputPath, outputPath, bitrateKbps } = options;
  const args = [
    '-i', inputPath,
    '-vn',
    '-c:a', 'libopus',
    '-b:a', `${bitrateKbps}k`,
    '-vbr', 'on',
    '-compression_level', '10',
    '-map_metadata', '0',
    '-f', 'opus',
    outputPath,
  ];

  await runCommand('ffmpeg', args);
}
