import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// postgres.js opens connections lazily. Keeping one client per server process
// avoids exhausting a managed PostgreSQL connection limit during development.
export const sqlClient = postgres(
  process.env.DATABASE_URL ?? "postgres://localhost/eventlens",
  { max: 5, prepare: false, idle_timeout: 20, connect_timeout: 10 },
);

export const db = drizzle(sqlClient, { schema });
