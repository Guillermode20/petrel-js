import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "../../db";
import { refreshTokens } from "../../db/schema";
import { logger } from "../lib/logger";

/**
 * Token Service for managing refresh token persistence.
 * Replaces in-memory token blacklist with database storage.
 */
class TokenService {
	/**
	 * Store a new refresh token in the database
	 */
	async storeRefreshToken(params: {
		userId: number;
		tokenHash: string;
		expiresAt: Date;
	}): Promise<void> {
		try {
			await db.insert(refreshTokens).values({
				userId: params.userId,
				tokenHash: params.tokenHash,
				expiresAt: params.expiresAt,
				createdAt: new Date(),
			});

			logger.debug({ userId: params.userId }, "Refresh token stored");
		} catch (err) {
			logger.error({ err, userId: params.userId }, "Failed to store refresh token");
			throw err;
		}
	}

	/**
	 * Validate a refresh token (check if it exists and is not revoked)
	 * Returns true if valid, false if revoked or not found
	 */
	async validateRefreshToken(tokenHash: string): Promise<{ valid: boolean; userId?: number }> {
		try {
			const token = await db.query.refreshTokens.findFirst({
				where: and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)),
			});

			if (!token) {
				return { valid: false };
			}

			// Check if expired
			if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
				return { valid: false };
			}

			return { valid: true, userId: token.userId };
		} catch (err) {
			logger.error({ err }, "Failed to validate refresh token");
			return { valid: false };
		}
	}

	/**
	 * Revoke a specific refresh token
	 */
	async revokeRefreshToken(tokenHash: string): Promise<boolean> {
		try {
			const result = await db
				.update(refreshTokens)
				.set({ revokedAt: new Date() })
				.where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
				.returning();

			const revoked = result.length > 0;
			if (revoked) {
				logger.debug("Refresh token revoked");
			}

			return revoked;
		} catch (err) {
			logger.error({ err }, "Failed to revoke refresh token");
			return false;
		}
	}

	/**
	 * Revoke all refresh tokens for a user (e.g., on password change)
	 */
	async revokeAllUserTokens(userId: number): Promise<number> {
		try {
			const result = await db
				.update(refreshTokens)
				.set({ revokedAt: new Date() })
				.where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
				.returning();

			logger.info({ userId, count: result.length }, "All user tokens revoked");
			return result.length;
		} catch (err) {
			logger.error({ err, userId }, "Failed to revoke user tokens");
			return 0;
		}
	}

	/**
	 * Clean up expired refresh tokens from the database
	 * Should be run periodically (e.g., daily) to prevent table bloat
	 */
	async cleanupExpiredTokens(): Promise<number> {
		try {
			const result = await db
				.delete(refreshTokens)
				.where(lt(refreshTokens.expiresAt, new Date()))
				.returning();

			logger.info({ count: result.length }, "Expired refresh tokens cleaned up");
			return result.length;
		} catch (err) {
			logger.error({ err }, "Failed to cleanup expired tokens");
			return 0;
		}
	}

	/**
	 * Hash a refresh token for storage
	 * Uses SHA-256 for consistent, secure hashing
	 */
	hashToken(token: string): string {
		const hasher = new Bun.CryptoHasher("sha256");
		hasher.update(token);
		return hasher.digest("hex");
	}
}

export const tokenService = new TokenService();
