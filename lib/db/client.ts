import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Transaction-mode pooler (port 6543) requires prepare: false
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(sql, { schema });
