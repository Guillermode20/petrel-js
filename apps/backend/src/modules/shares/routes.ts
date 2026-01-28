import { Elysia, t } from 'elysia';
import { authMiddleware, requireAuth } from '../auth';
import { shareService } from '../../services/share.service';
import type { ApiResponse, ShareData } from './types';

function parseExpiry(input: string | null | undefined, set: { status?: number }): Date | null | undefined {
  if (input === undefined) return undefined;
  if (input === null || input === '') return null;
  const value = new Date(input);
  if (Number.isNaN(value.getTime())) {
    set.status = 400;
    return undefined;
  }
  return value;
}

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now();
}

export const shareRoutes = new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  .post(
    '/shares',
    requireAuth,
    async ({ body, set }): Promise<ApiResponse<ShareData>> => {
      const expiresAt = parseExpiry(body.expiresAt ?? null, set);
      if (expiresAt === undefined && body.expiresAt !== undefined && body.expiresAt !== null) {
        return { data: null, error: 'Invalid expiry' };
      }

      const created = await shareService.createShare({
        type: body.type,
        targetId: body.targetId,
        expiresAt,
        password: body.password ?? null,
        allowDownload: body.allowDownload ?? true,
        allowZip: body.allowZip ?? false,
        showMetadata: body.showMetadata ?? true,
      });

      return { data: { share: created.share, settings: created.settings }, error: null };
    },
    {
      body: t.Object({
        type: t.Union([t.Literal('file'), t.Literal('folder'), t.Literal('album')]),
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
    }
  )
  .get(
    '/shares/:token',
    async ({ params, query, set }): Promise<ApiResponse<ShareData>> => {
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

      return { data: { share: share.share, settings: share.settings }, error: null };
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
  )
  .delete(
    '/shares/:id',
    requireAuth,
    async ({ params, set }): Promise<ApiResponse<{ id: number }>> => {
      await shareService.deleteShare(params.id);
      return { data: { id: params.id }, error: null };
    },
    {
      params: t.Object({
        id: t.Number({ minimum: 1 }),
      }),
      detail: {
        summary: 'Revoke share link',
        description: 'Deletes a share',
        tags: ['Shares'],
      },
    }
  )
  .patch(
    '/shares/:id',
    requireAuth,
    async ({ params, body, set }): Promise<ApiResponse<ShareData>> => {
      const expiresAt = parseExpiry(body.expiresAt, set);
      if (expiresAt === undefined && body.expiresAt !== undefined && body.expiresAt !== null) {
        return { data: null, error: 'Invalid expiry' };
      }
      const updated = await shareService.updateShare(params.id, {
        expiresAt,
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
    },
    {
      params: t.Object({
        id: t.Number({ minimum: 1 }),
      }),
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
    }
  );