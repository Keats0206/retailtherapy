import { auth } from "@clerk/nextjs/server";

import {
  getInterestCount,
  hasUserRegisteredInterest,
  registerInterest,
  registerInterestByEmail,
} from "@/lib/show-interest";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { getShowBySlug } from "@/lib/shows";

// GET /api/shows/<slug>/interest — public interest count for a scheduled show.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show || show.status !== "scheduled") {
    return Response.json({ error: "Show not found" }, { status: 404 });
  }

  const { userId } = await auth();
  const [total, registered] = await Promise.all([
    getInterestCount(show.id),
    userId
      ? hasUserRegisteredInterest(show.id, userId)
      : Promise.resolve(false),
  ]);

  return Response.json({ total, registered });
}

// POST /api/shows/<slug>/interest — register interest in an upcoming show.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = clientIp(request);
  const limit = checkRateLimit(`show-interest:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSec ?? 60);
  }

  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show || show.status !== "scheduled") {
    return Response.json({ error: "Show not found" }, { status: 404 });
  }

  const { userId } = await auth();

  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    if (userId) {
      const result = await registerInterest({
        streamId: show.id,
        userId,
      });
      return Response.json(result);
    }

    const email = body.email?.trim();
    if (!email) {
      return Response.json(
        { error: "Sign in or enter your email to register interest" },
        { status: 400 },
      );
    }

    const result = await registerInterestByEmail({
      streamId: show.id,
      email,
    });
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to register interest";
    return Response.json({ error: message }, { status: 400 });
  }
}
