import { Elysia, t } from "elysia";
import { requireAdmin } from "../auth";
import { storageSyncService } from "../../services/storage-sync.service";

interface ApiResponse<T> {
	data: T | null;
	error: string | null;
}

export const adminRoutes = new Elysia({ prefix: "/api/admin" })
	.use(requireAdmin)
	.post(
		"/sync/validate",
		async (): Promise<ApiResponse<Awaited<ReturnType<typeof storageSyncService.validateSync>>>> => {
			try {
				const report = await storageSyncService.validateSync();
				return { data: report, error: null };
			} catch (err) {
				return { data: null, error: err instanceof Error ? err.message : "Validation failed" };
			}
		},
		{
			detail: {
				summary: "Validate database/storage sync",
				description: "Detect orphaned files on disk and orphaned database records",
				tags: ["Admin"],
			},
		},
	)
	.post(
		"/sync/repair",
		async ({ body }): Promise<ApiResponse<Awaited<ReturnType<typeof storageSyncService.importOrphanedFiles>>>> => {
			try {
				const report = await storageSyncService.importOrphanedFiles({
					enrichMetadata: body.enrichMetadata,
				});
				return { data: report, error: null };
			} catch (err) {
				return { data: null, error: err instanceof Error ? err.message : "Repair failed" };
			}
		},
		{
			body: t.Object({
				enrichMetadata: t.Optional(t.Boolean({ default: false })),
			}),
			detail: {
				summary: "Repair orphaned disk files",
				description: "Re-import files that exist on disk but have no database record",
				tags: ["Admin"],
			},
		},
	)
	.post(
		"/sync/cleanup",
		async (): Promise<ApiResponse<Awaited<ReturnType<typeof storageSyncService.cleanupOrphanedDatabaseRecords>>>> => {
			try {
				const report = await storageSyncService.cleanupOrphanedDatabaseRecords();
				return { data: report, error: null };
			} catch (err) {
				return { data: null, error: err instanceof Error ? err.message : "Cleanup failed" };
			}
		},
		{
			detail: {
				summary: "Cleanup orphaned database records",
				description: "Remove database records for files that no longer exist on disk",
				tags: ["Admin"],
			},
		},
	);
