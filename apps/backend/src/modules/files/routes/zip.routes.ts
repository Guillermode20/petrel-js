import { Elysia, t } from "elysia";
import { zipRateLimit } from "../../../lib/rate-limit";
import {
	buildZipDownloadFilename,
	createZipArchive,
	getPrimaryJobFolderName,
	getZipJob,
	scheduleZipCleanup,
} from "../../../services/zip.service";
import { requireAuth } from "../../auth";
import type { ApiResponse } from "../types";

export const zipRoutes = new Elysia({ prefix: "/api" })
	.use(requireAuth)
	.use(zipRateLimit)
	.post(
		"/files/download-zip",
		async ({ body, set, user }): Promise<ApiResponse<{ jobId: string }>> => {
			const fileIds: number[] = [];
			const folderIds: number[] = [];

			for (const id of body.fileIds ?? []) {
				const fileId = typeof id === "number" ? id : parseInt(String(id), 10);
				if (!Number.isFinite(fileId)) {
					set.status = 400;
					return { data: null, error: "Invalid file id" };
				}
				fileIds.push(fileId);
			}

			for (const id of body.folderIds ?? []) {
				const folderId = typeof id === "number" ? id : parseInt(String(id), 10);
				if (!Number.isFinite(folderId)) {
					set.status = 400;
					return { data: null, error: "Invalid folder id" };
				}
				folderIds.push(folderId);
			}

			if (fileIds.length === 0 && folderIds.length === 0) {
				set.status = 400;
				return { data: null, error: "At least one file or folder must be selected" };
			}

			const result = await createZipArchive({
				fileIds,
				folderIds,
				userId: user.userId,
			});

			if (!result.success) {
				set.status = 400;
				return { data: null, error: result.error };
			}

			return { data: { jobId: result.jobId }, error: null };
		},
		{
			body: t.Object({
				fileIds: t.Optional(t.Array(t.Union([t.Number(), t.String()]))),
				folderIds: t.Optional(t.Array(t.Union([t.Number(), t.String()]))),
			}),
			detail: {
				summary: "Create ZIP download",
				description: "Creates a ZIP archive containing selected files and folders",
				tags: ["Files"],
			},
		},
	)
	.get(
		"/files/download-zip/:jobId",
		async ({ params, set, user }) => {
			const job = await getZipJob(params.jobId);

			if (!job) {
				set.status = 404;
				return { data: null, error: "ZIP job not found" };
			}

			if (job.userId !== user.userId) {
				set.status = 403;
				return { data: null, error: "Access denied" };
			}

			if (job.status === "pending" || job.status === "processing") {
				set.status = 202;
				return { data: { status: job.status, progress: job.progress }, error: null };
			}

			if (job.status === "error") {
				set.status = 500;
				return { data: null, error: job.error ?? "ZIP creation failed" };
			}

			if (job.status === "cancelled") {
				set.status = 400;
				return { data: null, error: "ZIP job was cancelled" };
			}

			if (!job.tempPath) {
				set.status = 404;
				return { data: null, error: "ZIP file not found" };
			}

			const folderName = await getPrimaryJobFolderName(job);
			const filename = buildZipDownloadFilename(null, new Date(), folderName);

			set.headers["Content-Type"] = "application/zip";
			set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;

			scheduleZipCleanup(params.jobId);

			return new Response(Bun.file(job.tempPath));
		},
		{
			params: t.Object({
				jobId: t.String(),
			}),
			detail: {
				summary: "Download ZIP file",
				description: "Downloads a completed ZIP archive",
				tags: ["Files"],
			},
		},
	);
