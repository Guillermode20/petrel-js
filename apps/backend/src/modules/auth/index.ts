/**
 * Authentication Module
 *
 * This module provides JWT-based authentication for the Petrel fileserver.
 * Includes login, logout, refresh token endpoints and auth middleware.
 */

export { authMiddleware, requireAdmin, requireAuth } from "./middleware";
export { authRoutes } from "./routes";
export type {
	AuthContext,
	ErrorResponse,
	JWTPayload,
	LoginRequest,
	MeResponse,
	RefreshPayload,
	SuccessResponse,
	TokenResponse,
	User,
} from "./types";
export { hashPassword, verifyPassword } from "./utils";
