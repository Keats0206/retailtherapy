import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// GET /api/health — lightweight readiness probe for deploy checks.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable";
    return Response.json({ ok: false, db: message }, { status: 503 });
  }
}
