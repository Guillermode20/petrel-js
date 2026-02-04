import { mkdir, rename } from "node:fs/promises";
import type { ServerSettings } from "@petrel/shared";
import { logger } from "../../lib/logger";
import { getStorageRoot, resolveStoragePath } from "../../lib/storage";

const DEFAULT_SETTINGS: ServerSettings = {};

function getSettingsFilePath(): string {
	return resolveStoragePath("server-settings.json");
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
				const parsed = JSON.parse(content) as ServerSettings;
				this.settings = { ...DEFAULT_SETTINGS, ...parsed };
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
	 * Update server settings and persist to file
	 */
	async updateSettings(updates: Partial<ServerSettings>): Promise<ServerSettings> {
		const current = await this.getSettings();
		const merged: ServerSettings = {
			...current,
			...updates,
		};

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
			const backupFile = Bun.file(backupFilePath);
			if (await backupFile.exists()) {
				await backupFile.delete();
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
	 * Reset settings to defaults (based on env vars)
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
			const backupFile = Bun.file(backupFilePath);
			if (await backupFile.exists()) {
				await backupFile.delete();
			}

			this.settings = defaults;

			logger.info("Server settings reset to defaults");
			return defaults;
		} catch (error) {
			logger.error(error, "Failed to reset server settings");
			throw new Error("Failed to reset server settings");
		}
	}
}

export const serverSettingsService = new ServerSettingsService();
