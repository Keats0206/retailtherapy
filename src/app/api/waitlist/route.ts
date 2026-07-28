import { getSignedInUser } from "@/lib/auth";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { isValidEmail, joinWaitlist } from "@/lib/waitlist";

// POST /api/waitlist — join the host waitlist. Public: /apply is the front door
// for people who don't have an account yet, so this can't require a session.
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = checkRateLimit(`waitlist:${ip}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSec ?? 60);
  }

  let body: {
    email?: string;
    name?: string;
    handle?: string;
    pitch?: string;
    socials?: {
      instagram?: string;
      tiktok?: string;
      youtube?: string;
    };
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email = body.email?.trim() ?? "";
  if (!isValidEmail(email)) {
    return Response.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  }

  // Attach the Clerk id when there is one, but never make it a requirement.
  const user = await getSignedInUser();

  try {
    await joinWaitlist({
      email,
      name: body.name,
      handle: body.handle,
      pitch: body.pitch,
      socials: body.socials,
      userId: user?.id ?? null,
    });
    return Response.json({ ok: true });
  } catch (err) {
    // Never echo the driver error back: it carries the query and the submitted
    // values. Log it and hand the visitor something they can act on.
    console.error("[waitlist] signup failed", err);
    return Response.json(
      { error: "Couldn't save your spot. Try again in a moment." },
      { status: 500 },
    );
  }
}
