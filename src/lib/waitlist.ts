import "server-only";

import { db, waitlistSignups } from "@/lib/db";

/**
 * The host waitlist behind /apply. Hosting access is granted by hand, so this
 * is purely a queue of interest — nothing here changes what a user can do.
 */

export const MAX_FIELD_LENGTH = 280;

export type WaitlistInput = {
  email: string;
  name?: string | null;
  handle?: string | null;
  pitch?: string | null;
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

/**
 * Idempotent by email: signing up twice updates the details instead of
 * failing, so someone who resubmits with a fuller pitch isn't punished for it.
 *
 * A resubmit only overwrites fields it actually supplies — leaving the pitch
 * blank the second time must not erase the one we already have.
 */
export async function joinWaitlist(input: WaitlistInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const details = {
    name: trim(input.name),
    handle: trim(input.handle),
    pitch: trim(input.pitch),
    userId: input.userId ?? null,
  };

  const supplied = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== null),
  );

  await db
    .insert(waitlistSignups)
    .values({ email, ...details })
    .onConflictDoUpdate({
      target: waitlistSignups.email,
      set: { ...supplied, updatedAt: new Date() },
    });
}
