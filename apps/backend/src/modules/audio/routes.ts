import { Elysia, t } from 'elysia';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import type { File as SharedFile } from '@petrel/shared';
import { authMiddleware } from '../auth';
import { config } from '../../config';
import { streamRateLimit } from '../../lib/rate-limit';
import { parseRangeHeader } from '../../lib/http-range';
import { fileService } from '../../services/file.service';
import { audioService } from '../../services/audio.service';
import { shareService } from '../../services/share.service';

const GUEST_ACCESS_ENABLED = config.PETREL_GUEST_ACCESS;

function canRead(user: unknown): boolean {
  return Boolean(user) || GUEST_ACCESS_ENABLED;
}

function isExpired(value: Date | null): boolean {
  if (!value) {
    return false;
  }
  return value.getTime() <= Date.now();
}

interface AudioStreamQuery {
  shareToken?: string;
  password?: string;
}

interface AudioStreamContext {
  file: SharedFile;
  mimeType: string;
  path: string;
  size: number;
}

type StatusBag = { status?: number | string };

async function ensureShareAccess(
  file: SharedFile,
  query: AudioStreamQuery,
  set: StatusBag
): Promise<boolean> {
  const shareToken = query.shareToken;
  if (!shareToken) {
    return false;
  }

  const share = await shareService.getShareByToken(shareToken);
  if (!share) {
    set.status = 404;
    return false;
  }

  if (isExpired(share.share.expiresAt)) {
    set.status = 410;
    return false;
  }

  if (share.share.passwordHash) {
    const password = query.password ?? '';
    const valid = await shareService.verifySharePassword(share.share, password);
    if (!valid) {
      set.status = 401;
      return false;
    }
  }

  if (share.share.type !== 'file' || share.share.targetId !== file.id) {
    set.status = 403;
    return false;
  }

  if (!share.settings.allowDownload) {
    set.status = 403;
    return false;
  }

  return true;
}

async function resolveAudioStreamContext(
  params: { id: string },
  query: AudioStreamQuery,
  user: unknown,
  set: StatusBag
): Promise<AudioStreamContext | null> {
  const fileId = Number.parseInt(params.id, 10);
  if (Number.isNaN(fileId)) {
    set.status = 400;
    return null;
  }

  const file = await fileService.getById(fileId);
  if (!file) {
    set.status = 404;
    return null;
  }

  if (!file.mimeType.startsWith('audio/')) {
    set.status = 400;
    return null;
  }

  const shareAccessAttempted = Boolean(query.shareToken);
  if (shareAccessAttempted) {
    const shareResult = await ensureShareAccess(file, query, set);
    const statusCode = typeof set.status === 'number' ? set.status : undefined;
    if (!shareResult || (statusCode && statusCode >= 400)) {
      return null;
    }
  } else if (!canRead(user)) {
    set.status = 401;
    return null;
  }

  const source = await audioService.getStreamSource(file);
  const fileStat = await stat(source.absolutePath).catch(() => null);
  if (!fileStat) {
    set.status = 404;
    return null;
  }

  return {
    file,
    mimeType: source.mimeType,
    path: source.absolutePath,
    size: fileStat.size,
  };
}

function setBaseHeaders(
  headers: Headers,
  context: AudioStreamContext,
  contentLength: number
): void {
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'no-cache');
  headers.set('Content-Type', context.mimeType);
  headers.set('Content-Length', contentLength.toString());
}

function exposeStreamingHeaders(headers: Headers): void {
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length');
}

export const audioRoutes = new Elysia({ prefix: '/api/audio' })
  .use(authMiddleware)
  .use(streamRateLimit)
  .head(
    '/:id/stream',
    async ({ params, query, set, user }) => {
      const context = await resolveAudioStreamContext(params, query, user, set);
      if (!context) {
        const statusCode = typeof set.status === 'number' ? set.status : 401;
        set.status = statusCode;
        return '';
      }

      const headers = new Headers();
      setBaseHeaders(headers, context, context.size);
      exposeStreamingHeaders(headers);
      set.status = 200;
      return new Response(null, { status: 200, headers });
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        shareToken: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/:id/stream',
    async ({ params, query, request, set, user }) => {
      const context = await resolveAudioStreamContext(params, query, user, set);
      if (!context) {
        const statusCode = typeof set.status === 'number' ? set.status : 401;
        set.status = statusCode;
        return 'Unauthorized';
      }

      const rangeHeader = request.headers.get('range');
      const range = parseRangeHeader(rangeHeader, context.size);

      if (rangeHeader && !range) {
        const headers = new Headers();
        headers.set('Content-Range', `bytes */${context.size}`);
        exposeStreamingHeaders(headers);
        set.status = 416;
        return new Response('Requested Range Not Satisfiable', { status: 416, headers });
      }

      const start = range?.start ?? 0;
      const end = range?.end ?? context.size - 1;
      const chunkSize = end - start + 1;

      const headers = new Headers();
      setBaseHeaders(headers, context, chunkSize);
      exposeStreamingHeaders(headers);

      let statusCode = 200;
      if (range) {
        statusCode = 206;
        headers.set('Content-Range', `bytes ${start}-${end}/${context.size}`);
      }

      const stream = createReadStream(context.path, { start, end });

      set.status = statusCode;
      return new Response(stream, { status: statusCode, headers });
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        shareToken: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
    }
  );
