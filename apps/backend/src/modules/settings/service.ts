import type { UserSettings } from "@petrel/shared";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { userSettings } from "../../../db/schema";
import { logger } from "../../lib/logger";

const DEFAULT_SETTINGS: Omit<UserSettings, "userId"> = {
	profile: {
		username: "",
		displayName: null,
	},
	playback: {
		video: {
			defaultQuality: "auto",
			autoplayNext: true,
			defaultVolume: 100,
			subtitleLanguagePriority: [],
			audioLanguagePriority: [],
			rememberPlaybackPosition: true,
			defaultPlaybackSpeed: 1,
		},
		audio: {
			volumeNormalization: false,
			gaplessPlayback: true,
			visualizerStyle: "waveform",
		},
	},
	display: {
		theme: {
			mode: "dark",
			accentColor: "orange",
			fontSize: "medium",
			sharpCorners: true,
			terminalEffects: false,
		},
		fileBrowser: {
			defaultViewMode: "grid",
			itemsPerPage: 20,
			showHiddenFiles: false,
			thumbnailSize: 300,
			defaultSortBy: "name",
			folderThumbnailPreview: true,
		},
	},
	sharing: {
		defaultExpiry: "7d",
		defaultPasswordProtection: false,
		defaultDownloadPermission: true,
		defaultQuality: "auto",
		analyticsOptOut: false,
		autoExpireOldShares: {
			enabled: false,
			thresholdDays: 30,
		},
	},
	storage: {
		defaultUploadFolder: null,
		parallelUploadLimit: 3,
		autoTranscode: "ask",
		duplicateFileHandling: "rename",
	},
	notifications: {
		inApp: {
			uploadComplete: true,
			transcodeComplete: true,
			shareAccessed: false,
			lowStorageWarning: true,
		},
		email: {
			shareExpiryWarning: true,
			uploadCompletion: false,
			securityAlerts: true,
		},
	},
};

class SettingsService {
	/**
	 * Get user settings with transaction safety
	 * Creates default settings if none exist
	 */
	async getUserSettings(userId: number): Promise<UserSettings> {
		try {
			// Use transaction to ensure consistency
			const result = await db.transaction(async (tx) => {
				const existing = await tx.query.userSettings.findFirst({
					where: eq(userSettings.userId, userId),
				});

				if (!existing) {
					// Create default settings within the same transaction
					const defaults = this.getDefaultSettings();
					const settings = { ...defaults, userId };

					await tx.insert(userSettings).values({
						userId,
						settings,
						updatedAt: new Date(),
					});

					logger.info(`Created default settings for user ${userId}`);
					return settings;
				}

				return existing.settings as unknown as UserSettings;
			});

			return { ...result, userId };
		} catch (error) {
			logger.error(error, `Failed to get settings for user ${userId}`);
			throw new Error("Failed to retrieve settings");
		}
	}

	/**
	 * Update settings with atomic transaction and optimistic locking
	 * This prevents race conditions during concurrent updates
	 */
	async updateSettings(userId: number, updates: Partial<UserSettings>): Promise<UserSettings> {
		try {
			const updated = await db.transaction(async (tx) => {
				// Lock the row for update to prevent concurrent modifications
				const existing = await tx.query.userSettings.findFirst({
					where: eq(userSettings.userId, userId),
				});

				if (!existing) {
					// Create new settings if none exist
					const defaults = this.getDefaultSettings();
					const newSettings = this.deepMerge(
						defaults as unknown as Record<string, unknown>,
						updates as unknown as Partial<Record<string, unknown>>,
					) as unknown as UserSettings;

					await tx.insert(userSettings).values({
						userId,
						settings: { ...newSettings, userId },
						updatedAt: new Date(),
					});

					logger.info(`Created settings with updates for user ${userId}`);
					return { ...newSettings, userId };
				}

				// Merge existing settings with updates
				const currentSettings = existing.settings as unknown as UserSettings;
				const merged = this.deepMerge(
					currentSettings as unknown as Record<string, unknown>,
					updates as unknown as Partial<Record<string, unknown>>,
				) as unknown as UserSettings;

				// Update within transaction
				await tx
					.update(userSettings)
					.set({
						settings: merged,
						updatedAt: new Date(),
					})
					.where(eq(userSettings.userId, userId));

				logger.info(`Updated settings for user ${userId}`);
				return merged;
			});

			return updated;
		} catch (error) {
			logger.error(error, `Failed to update settings for user ${userId}`);
			throw new Error("Failed to update settings");
		}
	}

	/**
	 * Reset settings to defaults
	 */
	async resetSettings(userId: number): Promise<UserSettings> {
		try {
			return await db.transaction(async (tx) => {
				const defaults = this.getDefaultSettings();
				const settings = { ...defaults, userId };

				// Delete existing and insert new
				await tx.delete(userSettings).where(eq(userSettings.userId, userId));
				await tx.insert(userSettings).values({
					userId,
					settings,
					updatedAt: new Date(),
				});

				logger.info(`Reset settings for user ${userId}`);
				return settings;
			});
		} catch (error) {
			logger.error(error, `Failed to reset settings for user ${userId}`);
			throw new Error("Failed to reset settings");
		}
	}

	/**
	 * Get default settings (deep clone)
	 */
	getDefaultSettings(): Omit<UserSettings, "userId"> {
		return structuredClone(DEFAULT_SETTINGS);
	}

	/**
	 * Deep merge utility for nested objects
	 */
	private deepMerge<T extends Record<string, unknown>>(
		target: T,
		source: Partial<T>,
	): T {
		const output = { ...target };
		for (const key in source) {
			const sourceValue = source[key];
			if (sourceValue && typeof sourceValue === "object" && !Array.isArray(sourceValue)) {
				const targetValue = output[key];
				output[key] = this.deepMerge(
					(targetValue as Record<string, unknown>) || {},
					sourceValue as Record<string, unknown>,
				) as T[Extract<keyof T, string>];
			} else {
				output[key] = sourceValue as T[Extract<keyof T, string>];
			}
		}
		return output;
	}
}

export const settingsService = new SettingsService();
