import type { File } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { config } from "../../config";
import { canRead } from "../../lib/route-helpers";
import { validateShareAccess } from "../../lib/share-validation";
import { fileService } from "../../services/file.service";
import { shareService } from "../../services/share.service";
import { authMiddleware } from "../auth";

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
	.onBeforeHandle(async ({ file, user, set, query }) => {
		const f = file as File | null;
		if (!f) {
			set.status = 404;
			return { data: null, error: "File not found" };
		}

		const shareToken = (query as Record<string, unknown> | undefined)?.shareToken;
		const sharePassword = (query as Record<string, unknown> | undefined)?.password;
		if (typeof shareToken === "string" && shareToken.length > 0) {
			const result = await validateShareAccess(shareToken, typeof sharePassword === "string" ? sharePassword : undefined);
			if (result.error) {
				set.status = result.status;
				return { data: null, error: result.error };
			}

			// Ensure file is within the share scope
			if (result.share!.share.type === "file") {
				if (result.share!.share.targetId !== f.id) {
					set.status = 403;
					return { data: null, error: "Access denied" };
				}
				return;
			}

			const content = await shareService.getShareContent(result.share!.share);
			if (!content || typeof (content as { path?: unknown }).path !== "string") {
				set.status = 400;
				return { data: null, error: "Invalid share" };
			}
			const sharePath = (content as { path: string }).path;
			if (sharePath === "") return;
			if (f.path === sharePath || f.path.startsWith(`${sharePath}/`)) return;

			set.status = 403;
			return { data: null, error: "Access denied" };
		}

		// Authenticated read access: any authenticated user can read
		if (user) return;

		if (!user && !config.PETREL_GUEST_ACCESS) {
			set.status = 401;
			return { data: null, error: "Unauthorized" };
		}
	});
