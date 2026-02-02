import type { User, UserRole } from "@petrel/shared";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { hashPassword } from "../modules/auth/utils";

export interface CreateUserInput {
	username: string;
	password: string;
	role: UserRole;
}

export interface UpdateUserInput {
	role: UserRole;
}

export class UserService {
	async list(): Promise<User[]> {
		const userList = await db.query.users.findMany({
			orderBy: (users, { asc }) => [asc(users.createdAt)],
		});
		return userList.map((user) => ({
			id: user.id,
			username: user.username,
			role: user.role as UserRole,
			createdAt: user.createdAt,
		}));
	}

	async getById(id: number): Promise<User | null> {
		const user = await db.query.users.findFirst({
			where: eq(users.id, id),
		});
		if (!user) return null;
		return {
			id: user.id,
			username: user.username,
			role: user.role as UserRole,
			createdAt: user.createdAt,
		};
	}

	async getByUsername(username: string): Promise<User | null> {
		const user = await db.query.users.findFirst({
			where: eq(users.username, username),
		});
		if (!user) return null;
		return {
			id: user.id,
			username: user.username,
			role: user.role as UserRole,
			createdAt: user.createdAt,
		};
	}

	async create(input: CreateUserInput): Promise<User> {
		const passwordHash = await hashPassword(input.password);
		const inserted = await db
			.insert(users)
			.values({
				username: input.username,
				passwordHash,
				role: input.role,
			})
			.returning();

		const created = inserted[0];
		if (!created) {
			throw new Error("Failed to create user");
		}

		return {
			id: created.id,
			username: created.username,
			role: created.role as UserRole,
			createdAt: created.createdAt,
		};
	}

	async update(id: number, input: UpdateUserInput): Promise<User> {
		const current = await this.getById(id);
		if (!current) {
			throw new Error("User not found");
		}

		if (current.role === "admin" && input.role !== "admin") {
			const adminCount = await db
				.select({ count: sql<number>`count(*)` })
				.from(users)
				.where(eq(users.role, "admin"));

			if (adminCount[0]?.count === 1) {
				throw new Error("Cannot remove admin role from the last admin user");
			}
		}

		const updated = await db
			.update(users)
			.set({ role: input.role })
			.where(eq(users.id, id))
			.returning();

		const updatedRow = updated[0];
		if (!updatedRow) {
			throw new Error("User not found");
		}

		return {
			id: updatedRow.id,
			username: updatedRow.username,
			role: updatedRow.role as UserRole,
			createdAt: updatedRow.createdAt,
		};
	}

	async delete(id: number): Promise<void> {
		const user = await this.getById(id);
		if (!user) {
			throw new Error("User not found");
		}

		if (user.role === "admin") {
			const adminCount = await db
				.select({ count: sql<number>`count(*)` })
				.from(users)
				.where(eq(users.role, "admin"));

			if (adminCount[0]?.count === 1) {
				throw new Error(
					"Cannot delete the last admin user - at least one admin account is required",
				);
			}
		}

		await db.delete(users).where(eq(users.id, id));
	}
}

export const userService = new UserService();
