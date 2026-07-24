import { endStaleShows } from "@/lib/shows";

// GET /api/cron/end-stale-shows — ends live shows with no recent snapshot activity.
// Called by Vercel Cron; requires CRON_SECRET bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "Cron not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ended = await endStaleShows();
    return Response.json({ ok: true, ended });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to end stale shows";
    return Response.json({ error: message }, { status: 500 });
  }
}
