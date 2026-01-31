import { jwt } from "@elysiajs/jwt";
import type { UserRole } from "@petrel/shared";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { config } from "../../config";
import { logger } from "../../lib/logger";
import { tokenService } from "../../services/token.service";
import { authMiddleware, requireAuth } from "./middleware";
import type { ApiResponse, JWTPayload, MeResponse, RefreshPayload, TokenResponse } from "./types";
import { verifyPassword } from "./utils";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Auth routes module with login, logout, refresh, and me endpoints
 * Includes rate limiting for brute force protection
 */
export const authRoutes = new Elysia({ prefix: "/api/auth" })
	// JWT plugins for access and refresh tokens
	.use(
		jwt({
			secret: config.JWT_SECRET,
			exp: "15m",
			name: "jwt",
		}),
	)
	.use(
		jwt({
			secret: config.JWT_REFRESH_SECRET,
			exp: "7d",
			name: "jwtRefresh",
		}),
	)
	// Rate limiting: 5 attempts per 15 minutes per IP
	.use(
		rateLimit({
			duration: 15 * 60 * 1000, // 15 minutes
			max: 5,
			generator: (request) => {
				// Use IP-based limiting
				const forwarded = request.headers.get("x-forwarded-for");
				const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
				return `auth-login:${ip}`;
			},
			skip: (request) => {
				// Skip rate limiting for non-login endpoints
				const url = new URL(request.url);
				return !url.pathname.includes("/api/auth/login");
			},
		}),
	)
	// Login endpoint
	.post(
		"/login",
		async ({ body, jwt, jwtRefresh, set }): Promise<ApiResponse<TokenResponse>> => {
			const { username, password } = body;

			// Find user by username
			const user = await db.query.users.findFirst({
				where: eq(users.username, username),
			});

			if (!user) {
				logger.warn({ username }, "Login attempt for non-existent user");
				set.status = 401;
				return {
					data: null,
					error: "Invalid credentials",
				};
			}

			// Verify password
			const isValidPassword = await verifyPassword(password, user.passwordHash);

			if (!isValidPassword) {
				logger.warn({ username }, "Login attempt with invalid password");
				set.status = 401;
				return {
					data: null,
					error: "Invalid credentials",
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
				type: "refresh",
			};

			// Generate tokens
			const accessToken = await jwt.sign(payload);
			const refreshToken = await jwtRefresh.sign(refreshPayload);

			// Store refresh token hash in database
			const tokenHash = tokenService.hashToken(refreshToken);
			const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
			await tokenService.storeRefreshToken({
				userId: user.id,
				tokenHash,
				expiresAt,
			});

			logger.info({ userId: user.id, username }, "User logged in successfully");

			return {
				data: {
					accessToken,
					refreshToken,
					user: {
						id: user.id,
						username: user.username,
						role: user.role,
					},
				},
				error: null,
			};
		},
		{
			body: t.Object({
				username: t.String({ minLength: 1, maxLength: 50 }),
				password: t.String({ minLength: 1, maxLength: 100 }),
			}),
			detail: {
				summary: "Login with username and password",
				description: "Authenticates user and returns access and refresh tokens",
				tags: ["Authentication"],
				responses: {
					200: {
						description: "Login successful",
					},
					401: {
						description: "Invalid credentials",
					},
					429: {
						description: "Too many login attempts",
					},
				},
			},
		},
	)
	// Logout endpoint
	.post(
		"/logout",
		async ({ headers, jwtRefresh, set }): Promise<ApiResponse<{ message: string }>> => {
			const authHeader = headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				set.status = 400;
				return {
					data: null,
					error: "Refresh token required",
				};
			}

			const refreshToken = authHeader.slice(7);

			try {
				// Verify the refresh token before revoking
				const payload = await jwtRefresh.verify(refreshToken);

				if (!payload || typeof payload !== "object" || payload.type !== "refresh") {
					set.status = 400;
					return {
						data: null,
						error: "Invalid refresh token",
					};
				}

				// Revoke token in database
				const tokenHash = tokenService.hashToken(refreshToken);
				await tokenService.revokeRefreshToken(tokenHash);

				logger.info({ userId: payload.userId }, "User logged out");

				return {
					data: { message: "Logged out successfully" },
					error: null,
				};
			} catch (_error) {
				logger.warn("Logout attempt with invalid token");
				set.status = 400;
				return {
					data: null,
					error: "Invalid refresh token",
				};
			}
		},
		{
			detail: {
				summary: "Logout user",
				description: "Invalidates the refresh token",
				tags: ["Authentication"],
				responses: {
					200: {
						description: "Logout successful",
					},
					400: {
						description: "Invalid token",
					},
				},
			},
		},
	)
	// Refresh token endpoint
	.post(
		"/refresh",
		async ({ headers, jwt, jwtRefresh, set }): Promise<ApiResponse<TokenResponse>> => {
			const authHeader = headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				set.status = 401;
				return {
					data: null,
					error: "Refresh token required",
				};
			}

			const refreshToken = authHeader.slice(7);

			// Check if token is revoked or expired in database
			const tokenHash = tokenService.hashToken(refreshToken);
			const tokenValidation = await tokenService.validateRefreshToken(tokenHash);

			if (!tokenValidation.valid) {
				set.status = 401;
				return {
					data: null,
					error: "Token has been revoked or expired",
				};
			}

			try {
				const payload = await jwtRefresh.verify(refreshToken);

				if (!payload || typeof payload !== "object" || payload.type !== "refresh") {
					set.status = 401;
					return {
						data: null,
						error: "Invalid refresh token",
					};
				}

				// Get user from database
				const user = await db.query.users.findFirst({
					where: eq(users.id, payload.userId as number),
				});

				if (!user) {
					set.status = 401;
					return {
						data: null,
						error: "User not found",
					};
				}

				// Create new access token
				const accessPayload: JWTPayload = {
					userId: user.id,
					username: user.username,
					role: user.role as UserRole,
				};

				const accessToken = await jwt.sign(accessPayload);

				// Rotate refresh token: revoke old hash, issue new token, store with TTL
				const newRefreshPayload: RefreshPayload = {
					userId: user.id,
					type: "refresh",
				};
				const newRefreshToken = await jwtRefresh.sign(newRefreshPayload);
				const newRefreshHash = tokenService.hashToken(newRefreshToken);
				await tokenService.storeRefreshToken({
					userId: user.id,
					tokenHash: newRefreshHash,
					expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
				});

				await tokenService.revokeRefreshToken(tokenHash);

				logger.debug({ userId: user.id }, "Access token refreshed");

				return {
					data: {
						accessToken,
						refreshToken: newRefreshToken,
						user: {
							id: user.id,
							username: user.username,
							role: user.role,
						},
					},
					error: null,
				};
			} catch (_error) {
				set.status = 401;
				return {
					data: null,
					error: "Invalid refresh token",
				};
			}
		},
		{
			detail: {
				summary: "Refresh access token",
				description: "Exchanges a valid refresh token for a new access token",
				tags: ["Authentication"],
				responses: {
					200: {
						description: "Token refreshed successfully",
					},
					401: {
						description: "Invalid or expired refresh token",
					},
				},
			},
		},
	)
	// Get current user endpoint (protected)
	.use(authMiddleware)
	.use(requireAuth)
	.get(
		"/me",
		async ({ user, set }): Promise<ApiResponse<MeResponse>> => {
			if (!user) {
				set.status = 401;
				return {
					data: null,
					error: "Unauthorized - Authentication required",
				};
			}

			const userData = await db.query.users.findFirst({
				where: eq(users.id, user.userId),
			});

			if (!userData) {
				set.status = 401;
				return {
					data: null,
					error: "Unauthorized - User not found",
				};
			}

			return {
				data: {
					id: userData.id,
					username: userData.username,
					role: userData.role,
					createdAt: userData.createdAt,
				},
				error: null,
			};
		},
		{
			detail: {
				summary: "Get current user info",
				description: "Returns information about the authenticated user",
				tags: ["Authentication"],
				responses: {
					200: {
						description: "User info retrieved successfully",
					},
					401: {
						description: "Unauthorized",
					},
				},
			},
		},
	);
