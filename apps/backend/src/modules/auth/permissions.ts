import type { FilePermission } from "@petrel/shared";
import { hasPermission } from "@petrel/shared";
import { Elysia } from "elysia";

export function requirePermission(permission: FilePermission) {
	return new Elysia({ name: `require-${permission}` })
		.onBeforeHandle(({ user, set }: any) => {
			if (!user) {
				set.status = 401;
				return {
					data: null,
					error: "Unauthorized - Authentication required",
				};
			}

			if (!hasPermission(user.role, permission)) {
				set.status = 403;
				return {
					data: null,
					error: `Forbidden - '${permission}' permission required`,
				};
			}
		});
}
