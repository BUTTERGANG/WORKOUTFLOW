// PostgreSQL database integration using Drizzle ORM
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.NEON_DATABASE) {
  throw new Error(
    "NEON_DATABASE must be set. Did you forget to add the NeonDB secret?",
  );
}

export const pool = new Pool({ connectionString: process.env.NEON_DATABASE });
export const db = drizzle({ client: pool, schema });
