import { mkdir, rename } from "node:fs/promises";
import type { ServerSettings, ServerSettingsUpdate } from "@petrel/shared";
import { logger } from "../../lib/logger";
import { getStorageRoot, resolveStoragePath } from "../../lib/storage";

const DEFAULT_SETTINGS: ServerSettings = {
	general: {
		appName: "Petrel",
		maxUploadSize: 5 * 1024 * 1024 * 1024, // 5GB
		defaultFolderView: "grid",
	},
	guestAccess: {
		enabled: false,
		requireApproval: true,
		defaultQuota: 0, // unlimited
	},
	transcoding: {
		enabled: true,
		maxResolution: "1080p",
		autoTranscode: false,
		parallelJobs: 2,
		deleteOriginal: false,
	},
	zipDownload: {
		enabled: true,
		maxSize: 2 * 1024 * 1024 * 1024, // 2GB
		maxFiles: 100,
	},
	logging: {
		level: "info",
		retainDays: 30,
	},
};

function getSettingsFilePath(): string {
	return resolveStoragePath("server-settings.json");
}

/**
 * Deep merge utility for nested objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
	const output: Record<string, unknown> = structuredClone(target);
	for (const key of Object.keys(source) as Array<keyof T>) {
		const sourceValue = source[key];
		if (typeof sourceValue === "undefined") {
			continue;
		}
		const targetValue = output[key as string];
		if (sourceValue && typeof sourceValue === "object" && !Array.isArray(sourceValue)) {
			output[key as string] = deepMerge(
				(targetValue as Record<string, unknown>) || {},
				sourceValue as Record<string, unknown>,
			);
		} else {
			output[key as string] = sourceValue as unknown;
		}
	}
	return output as T;
}

/**
 * Validate that parsed settings conform to expected structure
 */
function validateSettings(parsed: unknown): ServerSettings | null {
	if (!parsed || typeof parsed !== "object") {
		return null;
	}

	const obj = parsed as Record<string, unknown>;

	// Check required top-level sections
	const requiredSections = ["general", "guestAccess", "transcoding", "zipDownload", "logging"];
	for (const section of requiredSections) {
		if (!obj[section] || typeof obj[section] !== "object") {
			return null;
		}
	}

	// Type guard checks for each section
	const general = obj.general as Record<string, unknown>;
	if (typeof general.appName !== "string") return null;
	if (typeof general.maxUploadSize !== "number") return null;
	if (!["grid", "list"].includes(general.defaultFolderView as string)) return null;

	const guestAccess = obj.guestAccess as Record<string, unknown>;
	if (typeof guestAccess.enabled !== "boolean") return null;
	if (typeof guestAccess.requireApproval !== "boolean") return null;
	if (typeof guestAccess.defaultQuota !== "number") return null;

	const transcoding = obj.transcoding as Record<string, unknown>;
	if (typeof transcoding.enabled !== "boolean") return null;
	if (!["1080p", "720p", "480p"].includes(transcoding.maxResolution as string)) return null;
	if (typeof transcoding.autoTranscode !== "boolean") return null;
	if (typeof transcoding.parallelJobs !== "number") return null;
	if (typeof transcoding.deleteOriginal !== "boolean") return null;

	const zipDownload = obj.zipDownload as Record<string, unknown>;
	if (typeof zipDownload.enabled !== "boolean") return null;
	if (typeof zipDownload.maxSize !== "number") return null;
	if (typeof zipDownload.maxFiles !== "number") return null;

	const logging = obj.logging as Record<string, unknown>;
	if (!["debug", "info", "warn", "error"].includes(logging.level as string)) return null;
	if (typeof logging.retainDays !== "number") return null;

	return parsed as ServerSettings;
}

class ServerSettingsService {
	private settings: ServerSettings | null = null;

	/**
	 * Get server settings, loading from file if not already loaded
	 */
	async getSettings(): Promise<ServerSettings> {
		if (this.settings) {
			return this.settings;
		}

		try {
			const filePath = getSettingsFilePath();
			const file = Bun.file(filePath);

			if (await file.exists()) {
				const content = await file.text();
				const parsed = JSON.parse(content) as unknown;

				// Validate parsed settings
				const validated = validateSettings(parsed);
				if (validated) {
					// Deep merge with defaults to ensure all fields exist
					this.settings = deepMerge(
						DEFAULT_SETTINGS as unknown as Record<string, unknown>,
						validated as unknown as Partial<Record<string, unknown>>,
					) as unknown as ServerSettings;
				} else {
					logger.warn("Server settings file corrupted, using defaults");
					this.settings = structuredClone(DEFAULT_SETTINGS);
				}
			} else {
				this.settings = structuredClone(DEFAULT_SETTINGS);
			}
		} catch (error) {
			logger.error(error, "Failed to load server settings, using defaults");
			this.settings = structuredClone(DEFAULT_SETTINGS);
		}

		return this.settings;
	}

	/**
	 * Update server settings with deep merge and atomic file write
	 */
	async updateSettings(updates: ServerSettingsUpdate): Promise<ServerSettings> {
		const current = structuredClone(await this.getSettings());

		// Deep merge the updates with current settings
		const merged = deepMerge(
			current as unknown as Record<string, unknown>,
			updates as unknown as Partial<Record<string, unknown>>,
		) as unknown as ServerSettings;

		try {
			const filePath = getSettingsFilePath();
			const tempFilePath = `${filePath}.tmp`;
			const backupFilePath = `${filePath}.bak`;

			// Ensure storage directory exists
			await mkdir(getStorageRoot(), { recursive: true });

			// Write to temporary file first
			await Bun.write(tempFilePath, JSON.stringify(merged, null, 2));

			// Create backup of existing file if it exists
			const existingFile = Bun.file(filePath);
			if (await existingFile.exists()) {
				await Bun.write(backupFilePath, await existingFile.arrayBuffer());
			}

			// Atomic rename
			await rename(tempFilePath, filePath);

			// Clean up backup file on success
			try {
				const backupFile = Bun.file(backupFilePath);
				if (await backupFile.exists()) {
					await backupFile.delete();
				}
			} catch {
				// Non-critical error, backup can remain
			}

			this.settings = merged;

			logger.info("Server settings updated");
			return merged;
		} catch (error) {
			logger.error(error, "Failed to save server settings");
			throw new Error("Failed to save server settings");
		}
	}

	/**
	 * Reset settings to defaults with atomic file write
	 */
	async resetSettings(): Promise<ServerSettings> {
		const defaults = structuredClone(DEFAULT_SETTINGS);

		try {
			const filePath = getSettingsFilePath();
			const tempFilePath = `${filePath}.tmp`;
			const backupFilePath = `${filePath}.bak`;

			// Ensure storage directory exists
			await mkdir(getStorageRoot(), { recursive: true });

			// Write to temporary file first
			await Bun.write(tempFilePath, JSON.stringify(defaults, null, 2));

			// Create backup of existing file if it exists
			const existingFile = Bun.file(filePath);
			if (await existingFile.exists()) {
				await Bun.write(backupFilePath, await existingFile.arrayBuffer());
			}

			// Atomic rename
			await rename(tempFilePath, filePath);

			// Clean up backup file on success
			try {
				const backupFile = Bun.file(backupFilePath);
				if (await backupFile.exists()) {
					await backupFile.delete();
				}
			} catch {
				// Non-critical error, backup can remain
			}

			this.settings = defaults;

			logger.info("Server settings reset to defaults");
			return defaults;
		} catch (error) {
			logger.error(error, "Failed to reset server settings");
			throw new Error("Failed to reset server settings");
		}
	}

	/**
	 * Get default settings (deep clone)
	 */
	getDefaultSettings(): ServerSettings {
		return structuredClone(DEFAULT_SETTINGS);
	}
}

export const serverSettingsService = new ServerSettingsService();
