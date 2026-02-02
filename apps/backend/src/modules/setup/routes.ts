import { Elysia, t } from "elysia";
import { userService } from "../../services/user.service";

export const setupRoutes = new Elysia({ prefix: "/api/setup" })
	.get(
		"/status",
		async (): Promise<{ data: { needsAdminSetup: boolean }; error: null }> => {
			const adminCount = await userService.countAdmins();
			return { data: { needsAdminSetup: adminCount === 0 }, error: null };
		},
		{
			detail: {
				summary: "Check if admin setup is needed",
				description: "Returns whether the application needs initial admin setup",
				tags: ["Setup"],
			},
		},
	)
	.post(
		"/admin",
		async ({ body, set }): Promise<{ data: { user: { id: number; username: string; role: string } }; error: string | null }> => {
			try {
				const user = await userService.createInitialAdmin({
					username: body.username,
					password: body.password,
					role: "admin",
				});
				return {
					data: {
						user: {
							id: user.id,
							username: user.username,
							role: user.role,
						},
					},
					error: null,
				};
			} catch (error) {
				set.status = 409;
				return {
					data: { user: { id: 0, username: "", role: "" } },
					error: error instanceof Error ? error.message : "Failed to create admin",
				};
			}
		},
		{
			body: t.Object({
				username: t.String({ minLength: 3, maxLength: 50 }),
				password: t.String({ minLength: 8, maxLength: 100 }),
			}),
			detail: {
				summary: "Create initial admin account",
				description: "Creates the first admin account - only works when no admin exists",
				tags: ["Setup"],
			},
		},
	);
