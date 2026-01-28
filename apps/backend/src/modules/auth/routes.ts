import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { rateLimit } from 'elysia-rate-limit';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { authMiddleware, requireAuth } from './middleware';
import { hashPassword, verifyPassword } from './utils';
import type { JWTPayload, RefreshPayload, TokenResponse, MeResponse } from './types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'your-refresh-secret-change-in-production';

// In-memory refresh token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

/**
 * Auth routes module with login, logout, refresh, and me endpoints
 * Includes rate limiting for brute force protection
 */
export const authRoutes = new Elysia({ prefix: '/api/auth' })
  // JWT plugins for access and refresh tokens
  .use(
    jwt({
      secret: JWT_SECRET,
      exp: '15m',
      name: 'jwt',
    })
  )
  .use(
    jwt({
      secret: JWT_REFRESH_SECRET,
      exp: '7d',
      name: 'jwtRefresh',
    })
  )
  // Rate limiting: 5 attempts per 15 minutes per IP
  .use(
    rateLimit({
      duration: 15 * 60 * 1000, // 15 minutes
      max: 5,
      skip: (request) => {
        // Skip rate limiting for non-auth endpoints
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
        set.status = 401;
        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
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
        role: user.role,
      };

      const refreshPayload: RefreshPayload = {
        userId: user.id,
        type: 'refresh',
      };

      // Generate tokens
      const accessToken = await jwt.sign(payload);
      const refreshToken = await jwtRefresh.sign(refreshPayload);

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
        // Verify the refresh token before blacklisting
        const payload = await jwtRefresh.verify(refreshToken);

        if (!payload || typeof payload !== 'object' || payload.type !== 'refresh') {
          set.status = 400;
          return {
            success: false,
            message: 'Invalid refresh token',
          };
        }

        // Add token to blacklist
        tokenBlacklist.add(refreshToken);

        return {
          success: true,
          message: 'Logged out successfully',
        };
      } catch (error) {
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

      // Check if token is blacklisted
      if (tokenBlacklist.has(refreshToken)) {
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
          role: user.role,
        };

        const accessToken = await jwt.sign(accessPayload);

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
    async ({ user }): Promise<MeResponse> => {
      // Get full user info from database
      const userData = await db.query.users.findFirst({
        where: eq(users.id, user!.userId),
      });

      if (!userData) {
        throw new Error('User not found');
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
