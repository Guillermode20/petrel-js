import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import type { UserRole } from '@petrel/shared';
import { config } from '../../config';
import type { JWTPayload } from './types';

/**
 * JWT middleware that validates access tokens and adds user to context
 * Use .derive() pattern as per Elysia best practices
 */
export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .use(
    jwt({
      secret: config.JWT_SECRET,
      exp: '15m',
      name: 'jwt',
    })
  )
  .derive({ as: 'scoped' }, async ({ jwt, headers, query }): Promise<{ user: JWTPayload | null }> => {
    let token = '';
    const authHeader = headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (query.token) {
      token = query.token as string;
    }

    if (!token) {
      return { user: null };
    }

    try {
      const payload = await jwt.verify(token);

      if (!payload || typeof payload !== 'object') {
        return { user: null };
      }

      const userPayload: JWTPayload = {
        userId: payload.userId as number,
        username: payload.username as string,
        role: payload.role as UserRole,
      };

      return { user: userPayload };
    } catch (error) {
      return { user: null };
    }
  });

/**
 * Combined auth middleware with built-in authentication requirement
 * Returns 401 if user is not authenticated
 */
export const requireAuth = new Elysia({ name: 'require-auth' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        data: null,
        error: 'Unauthorized - Authentication required',
      };
    }
  });

/**
 * Combined auth middleware with admin requirement
 * Returns 401 if not authenticated, 403 if not admin
 */
export const requireAdmin = new Elysia({ name: 'require-admin' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        data: null,
        error: 'Unauthorized - Authentication required',
      };
    }

    if (user.role !== 'admin') {
      set.status = 403;
      return {
        data: null,
        error: 'Forbidden - Admin access required',
      };
    }
  });
