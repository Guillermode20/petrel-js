/**
 * Authentication Module
 *
 * This module provides JWT-based authentication for the Petrel fileserver.
 * Includes login, logout, refresh token endpoints and auth middleware.
 */

export { authRoutes } from './routes';
export { authMiddleware, requireAuth, requireAdmin } from './middleware';
export { hashPassword, verifyPassword } from './utils';
export type {
  JWTPayload,
  RefreshPayload,
  User,
  AuthContext,
  LoginRequest,
  TokenResponse,
  MeResponse,
  ErrorResponse,
  SuccessResponse,
} from './types';
