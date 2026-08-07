import { currentUser } from "@clerk/nextjs/server";

import {
  completeOnboarding,
  isOnboardingIntent,
  type OnboardingInput,
} from "@/lib/onboarding";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/onboarding — the single write behind /welcome.
 *
 * Keyed on the Clerk user id rather than an IP: this is an authenticated call
 * and the profile is per-account, so that is also the right rate-limit bucket.
 *
 * The client posts what it collected, so the shape is validated here rather
 * than trusted — the answers outlive the form that produced them, and the
 * intent field decides whether a waitlist application gets filed.
 */

const MAX_HANDLE = 64;

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = checkRateLimit(`onboarding:${user.id}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec ?? 60);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const input = normalizeInput(body);
  if (!input) {
    return Response.json({ error: "Invalid answers" }, { status: 400 });
  }

  try {
    await completeOnboarding(user, input);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[onboarding] complete failed", err);
    return Response.json(
      { error: "Couldn't save your answers" },
      { status: 500 },
    );
  }
}

/**
 * Coerces an untrusted payload into an `OnboardingInput`. Returns null unless
 * the intent is one we know — everything else has a safe empty fallback, since
 * a dropped brand pick is worth less than a blocked signup.
 */
function normalizeInput(body: Record<string, unknown>): OnboardingInput | null {
  if (!isOnboardingIntent(body.intent)) return null;

  const socials =
    body.socials && typeof body.socials === "object"
      ? (body.socials as Record<string, unknown>)
      : {};

  return {
    intent: body.intent,
    brands: strings(body.brands),
    categories: strings(body.categories),
    socials: {
      instagram: handle(socials.instagram),
      tiktok: handle(socials.tiktok),
      youtube: handle(socials.youtube),
    },
  };
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Matches the `@`-stripping the waitlist already does on its own inputs. */
function handle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^@+/, "").slice(0, MAX_HANDLE);
}
