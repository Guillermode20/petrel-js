import { stat } from 'node:fs/promises';
import { Elysia, t } from 'elysia';
import { authMiddleware, requireAuth } from '../auth';
import { shareRateLimit } from '../../lib/rate-limit';
import { shareService } from '../../services/share.service';
import { fileService } from '../../services/file.service';
import { folderService } from '../../services/folder.service';
import type { ApiResponse, ShareContentData, ShareData } from './types';
import type { File } from '@petrel/shared';

type RouteSet = { status?: number; headers?: Record<string, string> };

const protectedRoutes = new Elysia({ prefix: '/shares' })
  .use(requireAuth)
  .get('', async ({ user, set }): Promise<ApiResponse<ShareContentData[]>> => {
    const list = await shareService.listByUser(user.userId);
    const enriched = await Promise.all(
      list.map(async (item) => ({
        share: item.share,
        settings: item.settings,
        content: await shareService.getShareContent(item.share),
      }))
    );

    return { data: enriched, error: null };
  }, {
    detail: {
      summary: 'List share links',
      description: 'Returns all shares created by the authenticated user',
      tags: ['Shares'],
    },
  })
  .post('', async ({ user, set, body }): Promise<ApiResponse<ShareData>> => {
    const expiresAtInput = body.expiresAt ?? null;
    const parsedExpiry = parseExpiry(expiresAtInput, set);

    if (parsedExpiry === undefined && body.expiresAt !== undefined && body.expiresAt !== null) {
      return { data: null, error: 'Invalid expiry' };
    }

    const created = await shareService.createShare({
      type: body.type,
      targetId: body.targetId,
      expiresAt: parsedExpiry ?? null,
      password: body.password ?? null,
      allowDownload: body.allowDownload ?? true,
      allowZip: body.allowZip ?? false,
      showMetadata: body.showMetadata ?? true,
      createdBy: user.userId,
    });

    return { data: { share: created.share, settings: created.settings }, error: null };
  }, {
    body: t.Object({
      type: t.Union([t.Literal('file'), t.Literal('folder')]),
      targetId: t.Number({ minimum: 1 }),
      expiresAt: t.Optional(t.Union([t.String(), t.Null()])),
      password: t.Optional(t.Union([t.String(), t.Null()])),
      allowDownload: t.Optional(t.Boolean()),
      allowZip: t.Optional(t.Boolean()),
      showMetadata: t.Optional(t.Boolean()),
    }),
    detail: {
      summary: 'Create share link',
      description: 'Creates a share link with optional expiry and password',
      tags: ['Shares'],
    },
  })
  .delete('/:id', async ({ params, set }): Promise<ApiResponse<{ id: number }>> => {
    await shareService.deleteShare(params.id);
    return { data: { id: params.id }, error: null };
  }, {
    params: t.Object({ id: t.Number({ minimum: 1 }) }),
    detail: {
      summary: 'Revoke share link',
      description: 'Deletes a share',
      tags: ['Shares'],
    },
  })
  .patch('/:id', async ({ params, body, set }): Promise<ApiResponse<ShareData>> => {
    let expiresAtValue: Date | null | undefined = undefined;
    if (body.expiresAt !== undefined) {
      const parsed = parseExpiry(body.expiresAt, set);
      if (parsed === undefined && body.expiresAt !== null) {
        return { data: null, error: 'Invalid expiry' };
      }
      expiresAtValue = parsed ?? null;
    }

    const updated = await shareService.updateShare(params.id, {
      expiresAt: expiresAtValue,
      password: body.password,
      allowDownload: body.allowDownload,
      allowZip: body.allowZip,
      showMetadata: body.showMetadata,
    });

    if (!updated) {
      set.status = 404;
      return { data: null, error: 'Share not found' };
    }

    return { data: { share: updated.share, settings: updated.settings }, error: null };
  }, {
    params: t.Object({ id: t.Number({ minimum: 1 }) }),
    body: t.Object({
      expiresAt: t.Optional(t.Union([t.String(), t.Null()])),
      password: t.Optional(t.Union([t.String(), t.Null()])),
      allowDownload: t.Optional(t.Boolean()),
      allowZip: t.Optional(t.Boolean()),
      showMetadata: t.Optional(t.Boolean()),
    }),
    detail: {
      summary: 'Update share link',
      description: 'Updates expiry or password for a share',
      tags: ['Shares'],
    },
  });

function parseExpiry(value: string | null, set: RouteSet): Date | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    set.status = 400;
    return undefined;
  }

  return parsed;
}

function isExpired(value: Date | null): boolean {
  if (!value) {
    return false;
  }
  return value.getTime() <= Date.now();
}

const publicRoutes = new Elysia({ prefix: '/shares' })
  .use(shareRateLimit)
  .get(
    '/:token/download',
    async ({ params, query, set }) => {
      const share = await shareService.getShareByToken(params.token);
      if (!share) {
        set.status = 404;
        return { data: null, error: 'Share not found' };
      }

      if (isExpired(share.share.expiresAt)) {
        set.status = 410;
        return { data: null, error: 'Share expired' };
      }

      if (share.share.passwordHash) {
        const password = query.password ?? '';
        const valid = await shareService.verifySharePassword(share.share, password);
        if (!valid) {
          set.status = 401;
          return { data: null, error: 'Invalid password' };
        }
      }

      const content = await shareService.getShareContent(share.share);
      if (!content || share.share.type !== 'file') {
        set.status = 400;
        return { data: null, error: 'Download not available for this share' };
      }

      const fileRecord = content as File;
      const filePath = fileService.resolveDiskPath(fileRecord);
      const fileStat = await stat(filePath).catch(() => null);

      if (!fileStat) {
        set.status = 404;
        return { data: null, error: 'File not found' };
      }

      const headers = (set.headers ??= {} as Record<string, string>);
      headers['Content-Type'] = fileRecord.mimeType;
      headers['Content-Length'] = fileStat.size.toString();
      headers['Content-Disposition'] = `attachment; filename="${fileRecord.name}"`;

      return new Response(Bun.file(filePath));
    },
    {
      params: t.Object({
        token: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        password: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Download shared file',
        description: 'Streams the shared file for download',
        tags: ['Shares'],
      },
    }
  )
  .get(
    '/:token',
    async ({ params, query, set }): Promise<ApiResponse<ShareContentData>> => {
      const share = await shareService.getShareByToken(params.token);
      if (!share) {
        set.status = 404;
        return { data: null, error: 'Share not found' };
      }

      if (isExpired(share.share.expiresAt)) {
        set.status = 410;
        return { data: null, error: 'Share expired' };
      }

      if (share.share.passwordHash) {
        const password = query.password ?? '';
        const valid = await shareService.verifySharePassword(share.share, password);
        if (!valid) {
          set.status = 401;
          return { data: null, error: 'Invalid password' };
        }
      }

      await shareService.incrementViewCount(share.share.id);

      const content = await shareService.getShareContent(share.share);
      let files = undefined;
      let folders = undefined;

      if (share.share.type === 'folder' && content) {
        const childFolders = await folderService.listByParentId(content.id);
        folders = childFolders;

        const fileList = await fileService.listByPath(content.path, 100, 0);
        files = fileList.files;
      }

      return {
        data: {
          share: share.share,
          settings: share.settings,
          content,
          files,
          folders,
        },
        error: null,
      };
    },
    {
      params: t.Object({
        token: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        password: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Get shared content',
        description: 'Returns share metadata and settings for a token',
        tags: ['Shares'],
      },
    }
  );

export const shareRoutes = new Elysia({ prefix: '/api' })
  .use(publicRoutes)
  .use(authMiddleware)
  .use(protectedRoutes);