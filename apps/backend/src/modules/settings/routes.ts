import type { UserSettings } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../auth";
import { settingsService } from "./service";

export const settingsRoutes = new Elysia({ prefix: "/api" })
	.use(authMiddleware)
	.get(
		"/settings",
		async ({ user, set }): Promise<{ data: unknown | null; error: string | null }> => {
			if (!user) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			try {
				const settings = await settingsService.getUserSettings(user.userId);
				return { data: settings, error: null };
			} catch (error) {
				return {
					data: null,
					error: error instanceof Error ? error.message : "Failed to fetch settings",
				};
			}
		},
		{
			detail: {
				summary: "Get user settings",
				description: "Returns all settings for the authenticated user",
				tags: ["Settings"],
			},
		},
	)
	.get(
		"/settings/defaults",
		async (): Promise<{ data: unknown | null; error: string | null }> => {
			try {
				const defaults = settingsService.getDefaultSettings();
				return { data: defaults, error: null };
			} catch (error) {
				return {
					data: null,
					error: error instanceof Error ? error.message : "Failed to fetch defaults",
				};
			}
		},
		{
			detail: {
				summary: "Get default settings",
				description: "Returns the default settings values",
				tags: ["Settings"],
			},
		},
	)
	.use(requireAuth)
	.patch(
		"/settings",
		async ({ user, body, set }): Promise<{ data: unknown | null; error: string | null }> => {
			if (!user) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			try {
				const updates = body as Partial<UserSettings>;
				const updated = await settingsService.updateSettings(user.userId, updates);
				return { data: updated, error: null };
			} catch (error) {
				set.status = 500;
				return {
					data: null,
					error: error instanceof Error ? error.message : "Failed to update settings",
				};
			}
		},
		{
			body: t.Object({
				profile: t.Optional(
					t.Object({
						username: t.Optional(t.String()),
						displayName: t.Optional(t.Union([t.String(), t.Null()])),
					}),
				),
				playback: t.Optional(
					t.Object({
						video: t.Optional(
							t.Object({
								defaultQuality: t.Optional(
									t.Union([
										t.Literal("auto"),
										t.Literal("1080p"),
										t.Literal("720p"),
										t.Literal("480p"),
									]),
								),
								autoplayNext: t.Optional(t.Boolean()),
								defaultVolume: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
								subtitleLanguagePriority: t.Optional(t.Array(t.String())),
								audioLanguagePriority: t.Optional(t.Array(t.String())),
								rememberPlaybackPosition: t.Optional(t.Boolean()),
								defaultPlaybackSpeed: t.Optional(
									t.Number({ minimum: 0.5, maximum: 2, multipleOf: 0.25 }),
								),
							}),
						),
						audio: t.Optional(
							t.Object({
								volumeNormalization: t.Optional(t.Boolean()),
								gaplessPlayback: t.Optional(t.Boolean()),
								visualizerStyle: t.Optional(
									t.Union([t.Literal("waveform"), t.Literal("spectrum"), t.Literal("none")]),
								),
							}),
						),
					}),
				),
				display: t.Optional(
					t.Object({
						theme: t.Optional(
							t.Object({
								mode: t.Optional(
									t.Union([t.Literal("dark"), t.Literal("light"), t.Literal("system")]),
								),
								accentColor: t.Optional(
									t.Union([
										t.Literal("orange"),
										t.Literal("teal"),
										t.Literal("purple"),
										t.Literal("custom"),
									]),
								),
								fontSize: t.Optional(
									t.Union([t.Literal("small"), t.Literal("medium"), t.Literal("large")]),
								),
								sharpCorners: t.Optional(t.Boolean()),
								terminalEffects: t.Optional(t.Boolean()),
							}),
						),
						fileBrowser: t.Optional(
							t.Object({
								defaultViewMode: t.Optional(t.Union([t.Literal("grid"), t.Literal("list")])),
								itemsPerPage: t.Optional(t.Number({ minimum: 10, maximum: 100, multipleOf: 5 })),
								showHiddenFiles: t.Optional(t.Boolean()),
								thumbnailSize: t.Optional(t.Number({ minimum: 100, maximum: 500, multipleOf: 25 })),
								defaultSortBy: t.Optional(
									t.Union([
										t.Literal("name"),
										t.Literal("date"),
										t.Literal("size"),
										t.Literal("type"),
									]),
								),
								folderThumbnailPreview: t.Optional(t.Boolean()),
							}),
						),
					}),
				),
				sharing: t.Optional(
					t.Object({
						defaultExpiry: t.Optional(
							t.Union([
								t.Literal("1h"),
								t.Literal("24h"),
								t.Literal("7d"),
								t.Literal("30d"),
								t.Literal("never"),
							]),
						),
						defaultPasswordProtection: t.Optional(t.Boolean()),
						defaultDownloadPermission: t.Optional(t.Boolean()),
						defaultQuality: t.Optional(
							t.Union([
								t.Literal("auto"),
								t.Literal("1080p"),
								t.Literal("720p"),
								t.Literal("480p"),
							]),
						),
						analyticsOptOut: t.Optional(t.Boolean()),
						autoExpireOldShares: t.Optional(
							t.Object({
								enabled: t.Optional(t.Boolean()),
								thresholdDays: t.Optional(t.Number({ minimum: 1, maximum: 365 })),
							}),
						),
					}),
				),
				storage: t.Optional(
					t.Object({
						defaultUploadFolder: t.Optional(t.Union([t.String(), t.Null()])),
						parallelUploadLimit: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
						autoTranscode: t.Optional(
							t.Union([t.Literal("on"), t.Literal("off"), t.Literal("ask")]),
						),
						duplicateFileHandling: t.Optional(
							t.Union([t.Literal("skip"), t.Literal("rename"), t.Literal("overwrite")]),
						),
					}),
				),
				notifications: t.Optional(
					t.Object({
						inApp: t.Optional(
							t.Object({
								uploadComplete: t.Optional(t.Boolean()),
								transcodeComplete: t.Optional(t.Boolean()),
								shareAccessed: t.Optional(t.Boolean()),
								lowStorageWarning: t.Optional(t.Boolean()),
							}),
						),
						email: t.Optional(
							t.Object({
								shareExpiryWarning: t.Optional(t.Boolean()),
								uploadCompletion: t.Optional(t.Boolean()),
								securityAlerts: t.Optional(t.Boolean()),
							}),
						),
					}),
				),
			}),
			detail: {
				summary: "Update user settings",
				description: "Updates specific settings for the authenticated user",
				tags: ["Settings"],
			},
		},
	)
	.post(
		"/settings/reset",
		async ({ user, set }): Promise<{ data: unknown | null; error: string | null }> => {
			if (!user) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			try {
				const reset = await settingsService.resetSettings(user.userId);
				return { data: reset, error: null };
			} catch (error) {
				set.status = 500;
				return {
					data: null,
					error: error instanceof Error ? error.message : "Failed to reset settings",
				};
			}
		},
		{
			detail: {
				summary: "Reset user settings",
				description: "Resets all settings to defaults for the authenticated user",
				tags: ["Settings"],
			},
		},
	);
