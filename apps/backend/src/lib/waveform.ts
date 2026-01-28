import path from 'node:path';
import { stat } from 'node:fs/promises';
import { ensureDirectory, resolveStoragePath } from './storage';

function getWaveformDirectory(fileId: number): string {
  return path.posix.join('.waveforms', fileId.toString());
}

function getWaveformDataPath(fileId: number): string {
  return path.posix.join(getWaveformDirectory(fileId), 'waveform.json');
}

function getWaveformImagePath(fileId: number): string {
  return path.posix.join(getWaveformDirectory(fileId), 'waveform.png');
}

async function fileExists(absolutePath: string): Promise<boolean> {
  const statResult = await stat(absolutePath).catch(() => null);
  return statResult !== null;
}

export interface WaveformData {
  samples: number[];
  sampleRate: number;
  duration: number;
  channels: number;
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

async function extractAudioSamples(
  inputPath: string,
  sampleCount: number
): Promise<{ samples: number[]; sampleRate: number; channels: number }> {
  const args = [
    'ffmpeg',
    '-i', inputPath,
    '-ac', '1',
    '-filter:a', `aresample=8000,asetnsamples=n=${sampleCount}:p=0`,
    '-f', 's16le',
    '-acodec', 'pcm_s16le',
    '-',
  ];

  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdoutBuffer = await new Response(proc.stdout).arrayBuffer();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`FFmpeg failed: ${stderr}`);
  }

  const buffer = Buffer.from(stdoutBuffer);
  const samples: number[] = [];
  
  for (let i = 0; i < buffer.length; i += 2) {
    if (i + 1 < buffer.length) {
      const sample = buffer.readInt16LE(i);
      const normalized = sample / 32768;
      samples.push(Math.abs(normalized));
    }
  }

  return {
    samples,
    sampleRate: 8000,
    channels: 1,
  };
}

async function getDuration(inputPath: string): Promise<number> {
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    inputPath,
  ];

  const output = await runCommand('ffprobe', args);
  const parsed = JSON.parse(output) as { format?: { duration?: string } };
  return Number.parseFloat(parsed.format?.duration ?? '0');
}

export async function generateWaveformData(
  sourceAbsolutePath: string,
  fileId: number,
  targetSamples: number = 200
): Promise<WaveformData> {
  const waveformDataPath = resolveStoragePath(getWaveformDataPath(fileId));

  if (await fileExists(waveformDataPath)) {
    const existingData = await Bun.file(waveformDataPath).json().catch(() => null);
    if (existingData) {
      return existingData as WaveformData;
    }
  }

  await ensureDirectory(getWaveformDirectory(fileId));

  const duration = await getDuration(sourceAbsolutePath);
  const { samples, sampleRate, channels } = await extractAudioSamples(
    sourceAbsolutePath,
    targetSamples * 100
  );

  const compressedSamples = compressSamples(samples, targetSamples);

  const waveformData: WaveformData = {
    samples: compressedSamples,
    sampleRate,
    duration,
    channels,
  };

  await Bun.write(waveformDataPath, JSON.stringify(waveformData, null, 2));

  return waveformData;
}

function compressSamples(samples: number[], targetCount: number): number[] {
  if (samples.length <= targetCount) {
    return samples;
  }

  const result: number[] = [];
  const chunkSize = Math.floor(samples.length / targetCount);

  for (let i = 0; i < targetCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, samples.length);
    let sum = 0;
    let count = 0;

    for (let j = start; j < end; j++) {
      const sample = samples[j];
      if (sample !== undefined) {
        sum += sample;
        count++;
      }
    }

    result.push(count > 0 ? sum / count : 0);
  }

  return result;
}

export async function generateWaveformImage(
  sourceAbsolutePath: string,
  fileId: number,
  width: number = 800,
  height: number = 100
): Promise<string> {
  const waveformImagePath = resolveStoragePath(getWaveformImagePath(fileId));

  if (await fileExists(waveformImagePath)) {
    return waveformImagePath;
  }

  await ensureDirectory(getWaveformDirectory(fileId));

  const args = [
    '-i', sourceAbsolutePath,
    '-filter_complex', `aformat=channel_layouts=mono,showwavespic=s=${width}x${height}:colors=#a668fc`,
    '-frames:v', '1',
    '-y',
    waveformImagePath,
  ];

  await runCommand('ffmpeg', args);

  return waveformImagePath;
}
