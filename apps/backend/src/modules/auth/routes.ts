import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { rateLimit } from 'elysia-rate-limit';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { config } from '../../config';
import { logger } from '../../lib/logger';
import { tokenService } from '../../services/token.service';
import { authMiddleware, requireAuth } from './middleware';
import { hashPassword, verifyPassword } from './utils';
import type { UserRole } from '@petrel/shared';
import type { JWTPayload, RefreshPayload, TokenResponse, MeResponse } from './types';

/**
 * Auth routes module with login, logout, refresh, and me endpoints
 * Includes rate limiting for brute force protection
 */
export const authRoutes = new Elysia({ prefix: '/api/auth' })
  // JWT plugins for access and refresh tokens
  .use(
    jwt({
      secret: config.JWT_SECRET,
      exp: '15m',
      name: 'jwt',
    })
  )
  .use(
    jwt({
      secret: config.JWT_REFRESH_SECRET,
      exp: '7d',
      name: 'jwtRefresh',
    })
  )
  // Rate limiting: 5 attempts per 15 minutes per IP
  .use(
    rateLimit({
      duration: 15 * 60 * 1000, // 15 minutes
      max: 5,
      generator: (request) => {
        // Use IP-based limiting
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
        return `auth-login:${ip}`;
      },
      skip: (request) => {
        // Skip rate limiting for non-login endpoints
        const url = new URL(request.url);
        return !url.pathname.includes('/api/auth/login');
      },
    })
  )
  // Login endpoint
  .post(
    '/login',
    async ({ body, jwt, jwtRefresh, set }): Promise<TokenResponse | { success: false; message: string }> => {
      const { username, password } = body;

      // Find user by username
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!user) {
        logger.warn({ username }, 'Login attempt for non-existent user');
        set.status = 401;
        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
        logger.warn({ username }, 'Login attempt with invalid password');
        set.status = 401;
        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      // Create JWT payload
      const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
        role: user.role as UserRole,
      };

      const refreshPayload: RefreshPayload = {
        userId: user.id,
        type: 'refresh',
      };

      // Generate tokens
      const accessToken = await jwt.sign(payload);
      const refreshToken = await jwtRefresh.sign(refreshPayload);

      // Store refresh token hash in database
      const tokenHash = tokenService.hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await tokenService.storeRefreshToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      logger.info({ userId: user.id, username }, 'User logged in successfully');

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      };
    },
    {
      body: t.Object({
        username: t.String({ minLength: 1, maxLength: 50 }),
        password: t.String({ minLength: 1, maxLength: 100 }),
      }),
      detail: {
        summary: 'Login with username and password',
        description: 'Authenticates user and returns access and refresh tokens',
        tags: ['Authentication'],
        responses: {
          200: {
            description: 'Login successful',
          },
          401: {
            description: 'Invalid credentials',
          },
          429: {
            description: 'Too many login attempts',
          },
        },
      },
    }
  )
  // Logout endpoint
  .post(
    '/logout',
    async ({ headers, jwtRefresh, set }): Promise<{ success: true; message: string } | { success: false; message: string }> => {
      const authHeader = headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 400;
        return {
          success: false,
          message: 'Refresh token required',
        };
      }

      const refreshToken = authHeader.slice(7);

      try {
        // Verify the refresh token before revoking
        const payload = await jwtRefresh.verify(refreshToken);

        if (!payload || typeof payload !== 'object' || payload.type !== 'refresh') {
          set.status = 400;
          return {
            success: false,
            message: 'Invalid refresh token',
          };
        }

        // Revoke token in database
        const tokenHash = tokenService.hashToken(refreshToken);
        await tokenService.revokeRefreshToken(tokenHash);

        logger.info({ userId: payload.userId }, 'User logged out');

        return {
          success: true,
          message: 'Logged out successfully',
        };
      } catch (error) {
        logger.warn('Logout attempt with invalid token');
        set.status = 400;
        return {
          success: false,
          message: 'Invalid refresh token',
        };
      }
    },
    {
      detail: {
        summary: 'Logout user',
        description: 'Invalidates the refresh token',
        tags: ['Authentication'],
        responses: {
          200: {
            description: 'Logout successful',
          },
          400: {
            description: 'Invalid token',
          },
        },
      },
    }
  )
  // Refresh token endpoint
  .post(
    '/refresh',
    async ({ headers, jwt, jwtRefresh, set }): Promise<TokenResponse | { success: false; message: string }> => {
      const authHeader = headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
          success: false,
          message: 'Refresh token required',
        };
      }

      const refreshToken = authHeader.slice(7);

      // Check if token is revoked in database
      const tokenHash = tokenService.hashToken(refreshToken);
      const tokenValidation = await tokenService.validateRefreshToken(tokenHash);

      if (!tokenValidation.valid) {
        set.status = 401;
        return {
          success: false,
          message: 'Token has been revoked',
        };
      }

      try {
        const payload = await jwtRefresh.verify(refreshToken);

        if (!payload || typeof payload !== 'object' || payload.type !== 'refresh') {
          set.status = 401;
          return {
            success: false,
            message: 'Invalid refresh token',
          };
        }

        // Get user from database
        const user = await db.query.users.findFirst({
          where: eq(users.id, payload.userId as number),
        });

        if (!user) {
          set.status = 401;
          return {
            success: false,
            message: 'User not found',
          };
        }

        // Create new access token
        const accessPayload: JWTPayload = {
          userId: user.id,
          username: user.username,
          role: user.role as UserRole,
        };

        const accessToken = await jwt.sign(accessPayload);

        logger.debug({ userId: user.id }, 'Access token refreshed');

        return {
          accessToken,
          refreshToken, // Return same refresh token (or could generate new one)
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
        };
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid refresh token',
        };
      }
    },
    {
      detail: {
        summary: 'Refresh access token',
        description: 'Exchanges a valid refresh token for a new access token',
        tags: ['Authentication'],
        responses: {
          200: {
            description: 'Token refreshed successfully',
          },
          401: {
            description: 'Invalid or expired refresh token',
          },
        },
      },
    }
  )
  // Get current user endpoint (protected)
  .use(authMiddleware)
  .use(requireAuth)
  .get(
    '/me',
    async ({ user, set }): Promise<MeResponse | { success: false; message: string }> => {
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized - Authentication required',
        };
      }

      const userData = await db.query.users.findFirst({
        where: eq(users.id, user.userId),
      });

      if (!userData) {
        set.status = 401;
        return {
          success: false,
          message: 'Unauthorized - User not found',
        };
      }

      return {
        id: userData.id,
        username: userData.username,
        role: userData.role,
        createdAt: userData.createdAt,
      };
    },
    {
      detail: {
        summary: 'Get current user info',
        description: 'Returns information about the authenticated user',
        tags: ['Authentication'],
        responses: {
          200: {
            description: 'User info retrieved successfully',
          },
          401: {
            description: 'Unauthorized',
          },
        },
      },
    }
  );
