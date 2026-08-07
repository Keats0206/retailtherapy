import "server-only";

import { eq } from "drizzle-orm";

import { db, waitlistSignups } from "@/lib/db";

/**
 * The host waitlist behind /creators and /apply. Hosting access is granted
 * when an admin approves at /admin/waitlist.
 */

export const MAX_FIELD_LENGTH = 280;

export type WaitlistSocials = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
};

export type WaitlistInput = {
  email: string;
  name?: string | null;
  handle?: string | null;
  pitch?: string | null;
  socials?: WaitlistSocials | null;
  userId?: string | null;
};

/**
 * Deliberately permissive: one @ with something either side and no spaces.
 * Anything stricter rejects valid addresses, and the real proof an address
 * works is the email we send later.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function trim(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_FIELD_LENGTH) : null;
}

function cleanHandle(value: string | null | undefined): string | null {
  const trimmed = trim(value);
  if (!trimmed) return null;
  return trimmed.replace(/^@+/, "").slice(0, 64);
}

function normalizeSocials(
  socials: WaitlistSocials | null | undefined,
): WaitlistSocials | null {
  if (!socials) return null;

  const normalized = {
    instagram: cleanHandle(socials.instagram) ?? undefined,
    tiktok: cleanHandle(socials.tiktok) ?? undefined,
    youtube: cleanHandle(socials.youtube) ?? undefined,
  };

  if (!normalized.instagram && !normalized.tiktok && !normalized.youtube) {
    return null;
  }

  return normalized;
}

/** Flatten the first supplied handle for legacy `handle` column scanning. */
function primaryHandle(socials: WaitlistSocials | null): string | null {
  if (!socials) return null;
  const first =
    socials.instagram ?? socials.tiktok ?? socials.youtube ?? null;
  return first ? `@${first}` : null;
}

/**
 * Idempotent by email: signing up twice updates the details instead of
 * failing, so someone who resubmits with a fuller pitch isn't punished for it.
 *
 * A resubmit only overwrites fields it actually supplies — leaving the pitch
 * blank the second time must not erase the one we already have.
 */
export async function joinWaitlist(input: WaitlistInput): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const socials = normalizeSocials(input.socials);
  const details = {
    name: trim(input.name),
    handle: trim(input.handle) ?? primaryHandle(socials),
    pitch: trim(input.pitch),
    socials,
    userId: input.userId ?? null,
  };

  const supplied = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== null),
  );

  const [existing] = await db
    .select({ status: waitlistSignups.status })
    .from(waitlistSignups)
    .where(eq(waitlistSignups.email, email))
    .limit(1);

  const statusUpdate =
    existing?.status === "declined"
      ? { status: "pending" as const, reviewedAt: null, reviewedBy: null }
      : {};

  // Returns the row id on both paths — /welcome links the profile it just
  // wrote to the application it just filed.
  const [row] = await db
    .insert(waitlistSignups)
    .values({ email, ...details, status: "pending" })
    .onConflictDoUpdate({
      target: waitlistSignups.email,
      set: { ...supplied, ...statusUpdate, updatedAt: new Date() },
    })
    .returning({ id: waitlistSignups.id });

  return row.id;
}
