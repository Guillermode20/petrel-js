import type { ServerSettings } from "@petrel/shared";
import { config } from "../../config";
import { logger } from "../../lib/logger";
import { resolveStoragePath } from "../../lib/storage";

const DEFAULT_SETTINGS: ServerSettings = {
	transcoding: {
		audioTranscodeFlac: config.AUDIO_TRANSCODE_FLAC,
		audioOpusBitrateKbps: config.AUDIO_OPUS_BITRATE_KBPS,
	},
};

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
				this.settings = this.mergeWithDefaults(parsed);
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
			transcoding: {
				audioTranscodeFlac:
					updates.transcoding?.audioTranscodeFlac ?? current.transcoding.audioTranscodeFlac,
				audioOpusBitrateKbps:
					updates.transcoding?.audioOpusBitrateKbps ?? current.transcoding.audioOpusBitrateKbps,
			},
		};

		try {
			const filePath = getSettingsFilePath();
			const tempFilePath = filePath + ".tmp";
			const backupFilePath = filePath + ".bak";

			// Write to temporary file first
			await Bun.write(tempFilePath, JSON.stringify(merged, null, 2));

			// Create backup of existing file if it exists
			const existingFile = Bun.file(filePath);
			if (await existingFile.exists()) {
				await Bun.write(backupFilePath, await existingFile.arrayBuffer());
			}

			// Atomic rename
			await Bun.rename(tempFilePath, filePath);

			// Clean up backup file on success
			const backupFile = Bun.file(backupFilePath);
			if (await backupFile.exists()) {
				await Bun.file(backupFilePath).delete();
			}

			this.settings = merged;

			// Update runtime config
			this.applyToConfig(merged);

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
			const tempFilePath = filePath + ".tmp";
			const backupFilePath = filePath + ".bak";

			// Write to temporary file first
			await Bun.write(tempFilePath, JSON.stringify(defaults, null, 2));

			// Create backup of existing file if it exists
			const existingFile = Bun.file(filePath);
			if (await existingFile.exists()) {
				await Bun.write(backupFilePath, await existingFile.arrayBuffer());
			}

			// Atomic rename
			await Bun.rename(tempFilePath, filePath);

			// Clean up backup file on success
			const backupFile = Bun.file(backupFilePath);
			if (await backupFile.exists()) {
				await Bun.file(backupFilePath).delete();
			}

			this.settings = defaults;

			// Update runtime config
			this.applyToConfig(defaults);

			logger.info("Server settings reset to defaults");
			return defaults;
		} catch (error) {
			logger.error(error, "Failed to reset server settings");
			throw new Error("Failed to reset server settings");
		}
	}

	/**
	 * Apply settings to runtime config
	 */
	private applyToConfig(settings: ServerSettings): void {
		config.AUDIO_TRANSCODE_FLAC = settings.transcoding.audioTranscodeFlac;
		config.AUDIO_OPUS_BITRATE_KBPS = settings.transcoding.audioOpusBitrateKbps;
	}

	/**
	 * Merge loaded settings with defaults for any missing fields
	 */
	private mergeWithDefaults(loaded: Partial<ServerSettings>): ServerSettings {
		return {
			transcoding: {
				audioTranscodeFlac:
					loaded.transcoding?.audioTranscodeFlac ?? DEFAULT_SETTINGS.transcoding.audioTranscodeFlac,
				audioOpusBitrateKbps:
					loaded.transcoding?.audioOpusBitrateKbps ??
					DEFAULT_SETTINGS.transcoding.audioOpusBitrateKbps,
			},
		};
	}
}

export const serverSettingsService = new ServerSettingsService();
