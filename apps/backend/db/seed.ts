import { Database } from "bun:sqlite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { hashPassword } from "../src/modules/auth/utils";
import * as schema from "./schema";

const dbFile = process.env.PETREL_DB_PATH ?? "./petrel.db";

async function seed() {
	const sqlite = new Database(dbFile);
	const db = drizzle(sqlite, { schema });

	try {
		// Check if admin user already exists
		const existingAdmin = await db.query.users.findFirst({
			where: eq(schema.users.username, "admin"),
		});

		if (existingAdmin) {
			sqlite.close();
			return;
		}

		// Hash the default admin password
		const passwordHash = await hashPassword("admin123");

		// Insert default admin user
		await db.insert(schema.users).values({
			username: "admin",
			passwordHash,
			role: "admin",
		});
	} catch (_error) {
		process.exit(1);
	} finally {
		sqlite.close();
	}
}

seed();
