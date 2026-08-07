import { processPendingReminders } from "@/lib/show-reminders";

// GET /api/cron/show-reminders — send (or log) pre-show emails for interested viewers.
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
    const sent = await processPendingReminders();
    return Response.json({ ok: true, sent });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process reminders";
    return Response.json({ error: message }, { status: 500 });
  }
}
