import type { ApiResponse, User, UserRole } from "@petrel/shared";
import { Elysia, t } from "elysia";
import { userService } from "../../services/user.service";
import { requireAdmin } from "../auth/middleware";

export const userRoutes = new Elysia({ prefix: "/api/users" })
	.use(requireAdmin)
	.get("/", async (): Promise<ApiResponse<User[]>> => {
		const users = await userService.list();
		return { data: users, error: null };
	})
	.post(
		"/",
		async ({ body }): Promise<ApiResponse<User>> => {
			const user = await userService.create(body);
			return { data: user, error: null };
		},
		{
			body: t.Object({
				username: t.String({ minLength: 3, maxLength: 50 }),
				password: t.String({ minLength: 8, maxLength: 100 }),
				role: t.Union([
					t.Literal("admin"),
					t.Literal("manager"),
					t.Literal("editor"),
					t.Literal("user"),
					t.Literal("viewer"),
					t.Literal("guest"),
				]),
			}),
		},
	)
	.patch(
		"/:id",
		async ({ params, body }): Promise<ApiResponse<User>> => {
			const user = await userService.update(Number(params.id), body);
			return { data: user, error: null };
		},
		{
			params: t.Object({
				id: t.String(),
			}),
			body: t.Object({
				role: t.Union([
					t.Literal("admin"),
					t.Literal("manager"),
					t.Literal("editor"),
					t.Literal("user"),
					t.Literal("viewer"),
					t.Literal("guest"),
				]),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, set }): Promise<ApiResponse<{ id: number }>> => {
			try {
				await userService.delete(Number(params.id));
				return { data: { id: Number(params.id) }, error: null };
			} catch (error) {
				set.status = 400;
				return {
					data: null,
					error: error instanceof Error ? error.message : "Failed to delete user",
				};
			}
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	);
