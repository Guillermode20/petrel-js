import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

const dbFile = (process.env.DATABASE_URL ?? "petrel.db").replace(/^file:/, "");
export const sqlite = new Database(dbFile);
export const db = drizzle(sqlite, { schema });
