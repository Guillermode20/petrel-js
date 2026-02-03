import type { File } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { canRead } from "../../lib/route-helpers";
import { fileService } from "../../services/file.service";
import { authMiddleware, requireAuth } from "../auth";

export interface FileContext {
	file: File;
}

export const fileAccessGuard = new Elysia({ name: "file-access-guard" }).use(authMiddleware).guard({
	beforeHandle: ({ user, set }): undefined | { data: null; error: string } => {
		if (!canRead(user)) {
			set.status = 401;
			return { data: null, error: "Unauthorized" };
		}
	},
});

export const fileResolver = new Elysia({ name: "file-resolver" })
	.guard({
		params: t.Object({
			id: t.Number(),
		}),
	})
	.resolve(async ({ params }): Promise<{ file: File | null }> => {
		const file = await fileService.getById(params.id);
		return { file };
	});

export const fileOwnershipGuard = new Elysia({ name: "file-ownership-guard" })
	.use(requireAuth)
	.use(fileResolver)
	.guard({
		beforeHandle: ({ file, user, set }): undefined | { data: null; error: string } => {
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}

			if (user.role !== "admin" && file.uploadedBy !== null && file.uploadedBy !== user.userId) {
				set.status = 403;
				return { data: null, error: "Forbidden - You can only modify your own files" };
			}
		},
	});

export const fileReadGuard = new Elysia({ name: "file-read-guard" })
	.use(fileAccessGuard)
	.use(fileResolver)
	.guard({
		beforeHandle: ({ file, set }): undefined | { data: null; error: string } => {
			if (!file) {
				set.status = 404;
				return { data: null, error: "File not found" };
			}
		},
	});
