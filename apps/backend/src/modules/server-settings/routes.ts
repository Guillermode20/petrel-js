import type { ApiResponse, ServerSettings } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { logger } from "../../lib/logger";
import { authMiddleware } from "../auth";
import { serverSettingsService } from "./service";

export const serverSettingsRoutes = new Elysia({ prefix: "/api" })
	.use(authMiddleware)
	.get(
		"/server-settings",
		async ({ user, set }): Promise<ApiResponse<ServerSettings>> => {
			if (!user) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			if (user.role !== "admin") {
				set.status = 403;
				return { data: null, error: "Forbidden - Admin access required" };
			}

			try {
				const settings = await serverSettingsService.getSettings();
				return { data: settings, error: null };
			} catch (error) {
				set.status = 500;
				return {
					data: null,
					error: error instanceof Error ? error.message : "Failed to fetch server settings",
				};
			}
		},
		{
			detail: {
				summary: "Get server settings",
				description: "Returns all server settings (admin only)",
				tags: ["Server Settings"],
			},
		},
	)
	.patch(
		"/server-settings",
		async ({ user, body, set }): Promise<ApiResponse<ServerSettings>> => {
			if (!user) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			if (user.role !== "admin") {
				set.status = 403;
				return { data: null, error: "Forbidden - Admin access required" };
			}

			// Log settings update attempt
			logger.info({ userId: user.id, username: user.username }, "Server settings update attempted");

			// Validate body is not null/undefined
			if (!body || typeof body !== "object") {
				logger.warn({ userId: user.id }, "Server settings update failed: Invalid request body");
				set.status = 400;
				return {
					data: null,
					error: "Invalid request: body must be a valid object with at least one settings category",
				};
			}

			// Validate at least one settings category is present
			const validCategories = ["general", "guestAccess", "transcoding", "zipDownload", "logging"];
			const providedCategories = Object.keys(body).filter((key) => validCategories.includes(key));
			if (providedCategories.length === 0) {
				logger.warn(
					{ userId: user.id, body },
					"Server settings update failed: No valid categories provided",
				);
				set.status = 400;
				return {
					data: null,
					error: `Invalid request: must provide at least one of: ${validCategories.join(", ")}`,
				};
			}

			try {
				const updated = await serverSettingsService.updateSettings(body);
				logger.info({ userId: user.id }, "Server settings updated successfully");
				return { data: updated, error: null };
			} catch (error) {
				logger.error({ userId: user.id, error }, "Server settings update failed");
				set.status = 500;
				return {
					data: null,
					error: error instanceof Error ? error.message : "Failed to update server settings",
				};
			}
		},
		{
			body: t.Object(
				{
					general: t.Optional(
						t.Object({
							appName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
							maxUploadSize: t.Optional(
								t.Number({ minimum: 1024, maximum: 10 * 1024 * 1024 * 1024 }),
							),
							defaultFolderView: t.Optional(t.Union([t.Literal("grid"), t.Literal("list")])),
						}),
					),
					guestAccess: t.Optional(
						t.Object({
							enabled: t.Optional(t.Boolean()),
							requireApproval: t.Optional(t.Boolean()),
							defaultQuota: t.Optional(t.Number({ minimum: 0, maximum: 100 * 1024 * 1024 * 1024 })),
						}),
					),
					transcoding: t.Optional(
						t.Object({
							enabled: t.Optional(t.Boolean()),
							maxResolution: t.Optional(
								t.Union([t.Literal("1080p"), t.Literal("720p"), t.Literal("480p")]),
							),
							autoTranscode: t.Optional(t.Boolean()),
							parallelJobs: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
							deleteOriginal: t.Optional(t.Boolean()),
						}),
					),
					zipDownload: t.Optional(
						t.Object({
							enabled: t.Optional(t.Boolean()),
							maxSize: t.Optional(t.Number({ minimum: 1024, maximum: 10 * 1024 * 1024 * 1024 })),
							maxFiles: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
						}),
					),
					logging: t.Optional(
						t.Object({
							level: t.Optional(
								t.Union([
									t.Literal("debug"),
									t.Literal("info"),
									t.Literal("warn"),
									t.Literal("error"),
								]),
							),
							retainDays: t.Optional(t.Number({ minimum: 1, maximum: 365 })),
						}),
					),
				},
				{ additionalProperties: false },
			),
			error({ code, error, set }) {
				if (code === "VALIDATION") {
					logger.warn({ validationError: error }, "Server settings validation failed");
					set.status = 400;
					return {
						data: null,
						error: `Validation error: ${error.message}`,
					};
				}
			},
			detail: {
				summary: "Update server settings",
				description: "Updates server settings (admin only)",
				tags: ["Server Settings"],
			},
		},
	)
	.post(
		"/server-settings/reset",
		async ({ user, set }): Promise<ApiResponse<ServerSettings>> => {
			if (!user) {
				set.status = 401;
				return { data: null, error: "Unauthorized" };
			}

			if (user.role !== "admin") {
				set.status = 403;
				return { data: null, error: "Forbidden - Admin access required" };
			}

			try {
				const reset = await serverSettingsService.resetSettings();
				return { data: reset, error: null };
			} catch (error) {
				set.status = 500;
				return {
					data: null,
					error: error instanceof Error ? error.message : "Failed to reset server settings",
				};
			}
		},
		{
			detail: {
				summary: "Reset server settings",
				description: "Resets all server settings to defaults (admin only)",
				tags: ["Server Settings"],
			},
		},
	);
