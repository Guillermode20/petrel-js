import { stat } from "node:fs/promises";
import { Elysia, t } from "elysia";
import { fileService } from "../../../services/file.service";
import { fileReadGuard } from "../guards";

export const downloadRoutes = new Elysia({ prefix: "/api" }).use(fileReadGuard).get(
	"/files/:id/download",
	async ({ file, set }) => {
		if (!file) {
			set.status = 404;
			return { data: null, error: "File not found" };
		}

		const filePath = fileService.resolveDiskPath(file);
		const fileStat = await stat(filePath).catch(() => null);

		if (!fileStat) {
			set.status = 404;
			return { data: null, error: "File not found on disk" };
		}

		set.headers["Content-Type"] = file.mimeType;
		set.headers["Content-Length"] = fileStat.size.toString();
		set.headers["Content-Disposition"] = `attachment; filename="${file.name}"`;

		return new Response(Bun.file(filePath));
	},
	{
		params: t.Object({
			id: t.Number(),
		}),
		detail: {
			summary: "Download file",
			description: "Streams a file download by id",
			tags: ["Files"],
		},
	},
);
