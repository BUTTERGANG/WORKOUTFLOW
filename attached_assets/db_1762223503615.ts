// PostgreSQL database integration using Drizzle ORM
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use DATABASE_URL to match drizzle.config.ts and standard conventions
const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to add the database connection string?",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
