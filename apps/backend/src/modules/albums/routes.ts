import { Elysia, t } from 'elysia';
import { authMiddleware, requireAuth } from '../auth';
import { albumService } from '../../services/album.service';
import type { ApiResponse, AlbumWithFiles } from './types';

export const albumRoutes = new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  .use(requireAuth)
  .post(
    '/albums',
    async ({ body, set, user }): Promise<ApiResponse<AlbumWithFiles['album']>> => {
      const created = await albumService.createAlbum({
        name: body.name,
        description: body.description ?? null,
        coverFileId: body.coverFileId ?? null,
        ownerId: user.userId,
      });

      return { data: created, error: null };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        coverFileId: t.Optional(t.Union([t.Number({ minimum: 1 }), t.Null()])),
      }),
      detail: {
        summary: 'Create album',
        description: 'Creates a new album',
        tags: ['Albums'],
      },
    }
  )
  .get(
    '/albums/:id',
    async ({ params, set }): Promise<ApiResponse<AlbumWithFiles>> => {
      const album = await albumService.getAlbumWithFiles(params.id);
      if (!album) {
        set.status = 404;
        return { data: null, error: 'Album not found' };
      }

      return { data: album, error: null };
    },
    {
      params: t.Object({
        id: t.Number({ minimum: 1 }),
      }),
      detail: {
        summary: 'Get album',
        description: 'Returns album metadata and files',
        tags: ['Albums'],
      },
    }
  )
  .patch(
    '/albums/:id',
    async ({ params, body, set }): Promise<ApiResponse<AlbumWithFiles['album']>> => {
      const updated = await albumService.updateAlbum(params.id, {
        name: body.name,
        description: body.description,
        coverFileId: body.coverFileId,
      });

      if (!updated) {
        set.status = 404;
        return { data: null, error: 'Album not found' };
      }

      return { data: updated, error: null };
    },
    {
      params: t.Object({
        id: t.Number({ minimum: 1 }),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        coverFileId: t.Optional(t.Union([t.Number({ minimum: 1 }), t.Null()])),
      }),
      detail: {
        summary: 'Update album',
        description: 'Updates album metadata',
        tags: ['Albums'],
      },
    }
  )
  .post(
    '/albums/:id/files',
    async ({ params, body, set }): Promise<ApiResponse<{ added: number }>> => {
      const added = await albumService.addFilesToAlbum(params.id, body.fileIds);
      return { data: { added: added.length }, error: null };
    },
    {
      params: t.Object({
        id: t.Number({ minimum: 1 }),
      }),
      body: t.Object({
        fileIds: t.Array(t.Number({ minimum: 1 })),
      }),
      detail: {
        summary: 'Add files to album',
        description: 'Adds files to an album',
        tags: ['Albums'],
      },
    }
  )
  .delete(
    '/albums/:id/files/:fileId',
    async ({ params, set }): Promise<ApiResponse<{ removed: true }>> => {
      await albumService.removeFileFromAlbum(params.id, params.fileId);
      return { data: { removed: true }, error: null };
    },
    {
      params: t.Object({
        id: t.Number({ minimum: 1 }),
        fileId: t.Number({ minimum: 1 }),
      }),
      detail: {
        summary: 'Remove file from album',
        description: 'Removes a file from an album',
        tags: ['Albums'],
      },
    }
  )
  .patch(
    '/albums/:id/reorder',
    async ({ params, body, set }): Promise<ApiResponse<{ updated: number }>> => {
      await albumService.reorderFiles(params.id, body.items);
      return { data: { updated: body.items.length }, error: null };
    },
    {
      params: t.Object({
        id: t.Number({ minimum: 1 }),
      }),
      body: t.Object({
        items: t.Array(
          t.Object({
            fileId: t.Number({ minimum: 1 }),
            sortOrder: t.Number({ minimum: 0 }),
          })
        ),
      }),
      detail: {
        summary: 'Reorder album files',
        description: 'Updates sort order for album files',
        tags: ['Albums'],
      },
    }
  );