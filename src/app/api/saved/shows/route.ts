import { auth } from "@clerk/nextjs/server";

import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { listSavedShows, saveShow, unsaveShow } from "@/lib/saved";

/**
 * Saving a whole show rather than one item from it — the board keeps the
 * trail, so a viewer can come back to everything the host pinned.
 *
 * Shows are addressed by `slug`, the same public handle that appears in the
 * share link.
 */

function limitFor(userId: string) {
  return checkRateLimit(`saved-shows:${userId}`, {
    limit: 60,
    windowMs: 60_000,
  });
}

async function slugFrom(request: Request): Promise<string> {
  let body: { slug?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return typeof body.slug === "string" ? body.slug.trim().slice(0, 64) : "";
}

/** GET /api/saved/shows — saved shows as discovery cards. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = limitFor(userId);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec ?? 60);

  try {
    const shows = await listSavedShows(userId);
    return Response.json({ shows });
  } catch (err) {
    console.error("[saved] list shows failed", err);
    return Response.json({ error: "Couldn't load your saves" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = limitFor(userId);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec ?? 60);

  const slug = await slugFrom(request);
  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

  try {
    const saved = await saveShow(userId, slug);
    if (!saved) {
      return Response.json({ error: "Show not found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[saved] save show failed", err);
    return Response.json({ error: "Couldn't save that show" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = limitFor(userId);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec ?? 60);

  const slug = await slugFrom(request);
  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

  try {
    await unsaveShow(userId, slug);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[saved] unsave show failed", err);
    return Response.json({ error: "Couldn't remove that show" }, { status: 500 });
  }
}
