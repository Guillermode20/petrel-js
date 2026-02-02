import type { UserSettings } from "@petrel/shared";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { userSettings } from "../../../db/schema";

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
	async getUserSettings(userId: number): Promise<UserSettings> {
		const result = await db.query.userSettings.findFirst({
			where: eq(userSettings.userId, userId),
		});

		if (!result) {
			return this.createDefaultSettings(userId);
		}

		const settings = result.settings as unknown as UserSettings;
		return { ...settings, userId };
	}

	async updateSettings(userId: number, updates: Partial<UserSettings>): Promise<UserSettings> {
		const current = await this.getUserSettings(userId);
		const merged = this.deepMerge(
			current as unknown as Record<string, unknown>,
			updates as unknown as Partial<Record<string, unknown>>,
		) as unknown as UserSettings;

		const existing = await db.query.userSettings.findFirst({
			where: eq(userSettings.userId, userId),
		});

		if (existing) {
			await db
				.update(userSettings)
				.set({
					settings: merged,
					updatedAt: new Date(),
				})
				.where(eq(userSettings.userId, userId));
		} else {
			await db.insert(userSettings).values({
				userId,
				settings: merged,
				updatedAt: new Date(),
			});
		}

		return merged;
	}

	async resetSettings(userId: number): Promise<UserSettings> {
		return this.createDefaultSettings(userId);
	}

	getDefaultSettings(): Omit<UserSettings, "userId"> {
		return structuredClone(DEFAULT_SETTINGS);
	}

	private async createDefaultSettings(userId: number): Promise<UserSettings> {
		const defaults = this.getDefaultSettings();
		const settings = { ...defaults, userId };

		await db.insert(userSettings).values({
			userId,
			settings,
			updatedAt: new Date(),
		});

		return settings;
	}

	private deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
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
