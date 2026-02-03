import type { File } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { config } from "../../config";
import { canRead } from "../../lib/route-helpers";
import { fileService } from "../../services/file.service";
import { authMiddleware, requireAuth } from "../auth";

export interface FileContext {
	file: File;
}

export const fileAccessGuard = new Elysia({ name: "file-access-guard" })
	.use(authMiddleware)
	.onBeforeHandle(({ user, set }) => {
		if (!canRead(user)) {
			set.status = 401;
			return { data: null, error: "Unauthorized" };
		}
	});

export const fileResolver = new Elysia({ name: "file-resolver" }).derive(
	{ as: "scoped" },
	async ({ params }): Promise<{ file: File | null }> => {
		const id = (params as Record<string, string | undefined>).id;
		if (id === undefined) return { file: null };

		const file = await fileService.getById(Number(id));
		return { file };
	},
);

export const fileOwnershipGuard = new Elysia({ name: "file-ownership-guard" })
	.use(authMiddleware)
	.use(fileResolver)
	.onBeforeHandle(({ file, user, set }) => {
		if (!user) {
			set.status = 401;
			return { data: null, error: "Unauthorized" };
		}

		const f = file as File | null;
		if (!f) {
			set.status = 404;
			return { data: null, error: "File not found" };
		}

		if (user.role !== "admin" && f.uploadedBy !== null && f.uploadedBy !== user.userId) {
			set.status = 403;
			return { data: null, error: "Forbidden - You can only modify your own files" };
		}
	});

export const fileReadGuard = new Elysia({ name: "file-read-guard" })
	.use(authMiddleware)
	.use(fileResolver)
	.onBeforeHandle(({ file, user, set }) => {
		const f = file as File | null;
		if (!f) {
			set.status = 404;
			return { data: null, error: "File not found" };
		}

		// If guest access is enabled, we still want to protect files that aren't explicitly public
		// For now, if authenticated, follow ownership or role-based access
		if (user) {
			if (user.role === "admin") return;
			if (f.uploadedBy === user.userId) return;

			set.status = 403;
			return { data: null, error: "Access denied" };
		}

		if (!user && !config.PETREL_GUEST_ACCESS) {
			set.status = 401;
			return { data: null, error: "Unauthorized" };
		}
	});
