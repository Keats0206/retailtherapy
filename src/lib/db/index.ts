import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
  );
}

// Neon's HTTP driver — ideal for serverless/edge request handlers where each
// query is a stateless fetch. Reach for the WebSocket `Pool` only if you need
// interactive transactions.
const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });

export * from "./schema";
