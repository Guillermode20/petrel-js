import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import * as schema from "./schema";

const dbFile = (process.env.DATABASE_URL ?? "petrel.db").replace(/^file:/, "");
export const sqlite = new Database(dbFile);
export const db = drizzle(sqlite, { schema });

// Run migrations automatically in E2E mode
if (process.env.E2E_MODE === "true") {
	migrate(db, { migrationsFolder: "./drizzle" });
}
