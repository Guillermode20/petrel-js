import path from 'node:path';
import { eq, and, inArray } from 'drizzle-orm';
import type { TranscodeJob } from '@petrel/shared';
import { db } from '../../db';
import { transcodeJobs, files } from '../../db/schema';
import { transcodeToHLS } from '../lib/ffmpeg';
import { ensureDirectory, resolveStoragePath } from '../lib/storage';
import { fileService } from './file.service';

type TranscodeQuality = '1080p' | '720p' | '480p';

function getHlsDirectory(fileId: number): string {
  return path.posix.join('.hls', fileId.toString());
}

interface QueuedJob {
  id: number;
  fileId: number;
  filePath: string;
  quality: TranscodeQuality;
}

class TranscodeQueue {
  private isProcessing = false;
  private processingJobId: number | null = null;

  async queueTranscode(fileId: number, quality: TranscodeQuality = '720p'): Promise<TranscodeJob> {
    const existingJob = await db.query.transcodeJobs.findFirst({
      where: and(
        eq(transcodeJobs.fileId, fileId),
        inArray(transcodeJobs.status, ['pending', 'processing'])
      ),
    });

    if (existingJob) {
      return this.mapJobRow(existingJob);
    }

    const hlsDir = getHlsDirectory(fileId);
    await ensureDirectory(hlsDir);

    const inserted = await db
      .insert(transcodeJobs)
      .values({
        fileId,
        status: 'pending',
        progress: 0,
        outputPath: resolveStoragePath(hlsDir),
      })
      .returning();

    const insertedRow = inserted[0];
    if (!insertedRow) {
      throw new Error('Failed to create transcode job');
    }

    const job = this.mapJobRow(insertedRow);

    this.processQueue().catch(() => {});

    return job;
  }

  async getJobStatus(jobId: number): Promise<TranscodeJob | null> {
    const row = await db.query.transcodeJobs.findFirst({
      where: eq(transcodeJobs.id, jobId),
    });

    return row ? this.mapJobRow(row) : null;
  }

  async getJobByFileId(fileId: number): Promise<TranscodeJob | null> {
    const row = await db.query.transcodeJobs.findFirst({
      where: eq(transcodeJobs.fileId, fileId),
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
    });

    return row ? this.mapJobRow(row) : null;
  }

  async getAllPendingJobs(): Promise<TranscodeJob[]> {
    const rows = await db.query.transcodeJobs.findMany({
      where: inArray(transcodeJobs.status, ['pending', 'processing']),
      orderBy: (jobs, { asc }) => [asc(jobs.createdAt)],
    });

    return rows.map((row) => this.mapJobRow(row));
  }

  async cancelJob(jobId: number): Promise<boolean> {
    if (this.processingJobId === jobId) {
      return false;
    }

    const result = await db
      .update(transcodeJobs)
      .set({ status: 'failed', error: 'Cancelled by user' })
      .where(and(eq(transcodeJobs.id, jobId), eq(transcodeJobs.status, 'pending')))
      .returning();

    return result.length > 0;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      while (true) {
        const nextJob = await this.getNextJob();
        if (!nextJob) break;

        await this.processJob(nextJob);
      }
    } finally {
      this.isProcessing = false;
      this.processingJobId = null;
    }
  }

  private async getNextJob(): Promise<QueuedJob | null> {
    const row = await db.query.transcodeJobs.findFirst({
      where: eq(transcodeJobs.status, 'pending'),
      orderBy: (jobs, { asc }) => [asc(jobs.createdAt)],
    });

    if (!row) return null;

    const file = await fileService.getById(row.fileId);
    if (!file) {
      await db
        .update(transcodeJobs)
        .set({ status: 'failed', error: 'File not found' })
        .where(eq(transcodeJobs.id, row.id));
      return null;
    }

    return {
      id: row.id,
      fileId: row.fileId,
      filePath: fileService.resolveDiskPath(file),
      quality: '720p',
    };
  }

  private async processJob(job: QueuedJob): Promise<void> {
    this.processingJobId = job.id;

    await db
      .update(transcodeJobs)
      .set({ status: 'processing', progress: 0 })
      .where(eq(transcodeJobs.id, job.id));

    try {
      const hlsDir = getHlsDirectory(job.fileId);
      const hlsDirAbsolute = resolveStoragePath(hlsDir);
      await ensureDirectory(hlsDir);

      await transcodeToHLS({
        inputPath: job.filePath,
        outputDir: hlsDirAbsolute,
        quality: job.quality,
        onProgress: async (percent) => {
          await db
            .update(transcodeJobs)
            .set({ progress: percent })
            .where(eq(transcodeJobs.id, job.id))
            .catch(() => {});
        },
      });

      await db
        .update(transcodeJobs)
        .set({
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        })
        .where(eq(transcodeJobs.id, job.id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await db
        .update(transcodeJobs)
        .set({
          status: 'failed',
          error: errorMessage,
        })
        .where(eq(transcodeJobs.id, job.id));
    }
  }

  private mapJobRow(row: typeof transcodeJobs.$inferSelect): TranscodeJob {
    return {
      id: row.id,
      fileId: row.fileId,
      status: row.status as TranscodeJob['status'],
      progress: row.progress,
      outputPath: row.outputPath,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      error: row.error,
    };
  }
}

export const transcodeQueue = new TranscodeQueue();
