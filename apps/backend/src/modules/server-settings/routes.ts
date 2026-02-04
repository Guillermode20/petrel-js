import type { ApiResponse, ServerSettings } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { requireAdmin } from "../auth";
import { serverSettingsService } from "./service";

export const serverSettingsRoutes = new Elysia({ prefix: "/api" })
	.use(requireAdmin)
	.get(
		"/server-settings",
		async ({ set }): Promise<ApiResponse<ServerSettings>> => {
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
		async ({ body, set }): Promise<ApiResponse<ServerSettings>> => {
			try {
				const updates = body as Partial<ServerSettings>;
				const updated = await serverSettingsService.updateSettings(updates);
				return { data: updated, error: null };
			} catch (error) {
				set.status = 500;
				return {
					data: null,
					error: error instanceof Error ? error.message : "Failed to update server settings",
				};
			}
		},
		{
			body: t.Object({
				transcoding: t.Optional(
					t.Object({
						audioTranscodeFlac: t.Optional(t.Boolean()),
						audioOpusBitrateKbps: t.Optional(t.Number({ minimum: 64, maximum: 512 })),
					}),
				),
			}),
			detail: {
				summary: "Update server settings",
				description: "Updates server settings (admin only)",
				tags: ["Server Settings"],
			},
		},
	)
	.post(
		"/server-settings/reset",
		async ({ set }): Promise<ApiResponse<ServerSettings>> => {
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
