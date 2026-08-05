import "server-only";

import { eq } from "drizzle-orm";

import { db, profiles, type Profile } from "@/lib/db";
import {
  normalizeSocialInput,
  SOCIAL_PLATFORMS,
  type ProfileSocials,
} from "@/lib/social-links";

/**
 * The signed-in user's frontrow profile (name, city, socials). A row exists
 * only after the first Save on the profile form — /home uses that to decide
 * whether a fresh signup still needs setup.
 */

export const MAX_PROFILE_FIELD_LENGTH = 80;
export const MAX_PROFILE_BIO_LENGTH = 280;

export type ProfileInput = {
  name: string;
  city: string;
  bio: string;
  /** Raw field values as typed — handles, "@handles" or pasted links. */
  socials: Record<string, string>;
};

export async function getProfileForUser(
  userId: string,
): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

function cleanField(value: string, max = MAX_PROFILE_FIELD_LENGTH): string | null {
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

/** Run every social field through the shared handle-or-URL normalizer. */
function cleanSocials(raw: Record<string, string>): ProfileSocials {
  const socials: ProfileSocials = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const value = raw[platform];
    if (typeof value !== "string") continue;
    const normalized = normalizeSocialInput(platform, value);
    if (normalized) socials[platform] = normalized;
  }
  return socials;
}

/**
 * Idempotent by Clerk user id: the first Save creates the row, every later
 * one updates it. Unlike the waitlist, a blank field here is an erase — this
 * form is the single owner of these values, so what you see is what's stored.
 */
export async function saveProfileForUser(
  userId: string,
  input: ProfileInput,
): Promise<void> {
  const now = new Date();
  const row = {
    name: cleanField(input.name),
    city: cleanField(input.city),
    bio: cleanField(input.bio, MAX_PROFILE_BIO_LENGTH),
    socials: cleanSocials(input.socials),
    savedAt: now,
    updatedAt: now,
  };

  await db
    .insert(profiles)
    .values({ userId, ...row })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: row,
    });
}
