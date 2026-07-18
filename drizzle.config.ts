import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a plain Node CLI (outside Next.js), so it does not load
// .env* automatically. Load them in Next's precedence order (shell env wins,
// then .env.local, then .env). dotenv never overrides an already-set var, so
// loading the higher-priority file first gives the correct result.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  // Keep verbose + strict on for safer, reviewable migrations.
  verbose: true,
  strict: true,
});
