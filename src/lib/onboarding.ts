import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db, userProfiles } from "@/lib/db";
import type { OnboardingIntent, UserProfile } from "@/lib/db";
import { isKnownBrandSlug } from "@/lib/onboarding-brands";
import type { ShowSocials } from "@/lib/show-setup";
import { isValidEmail, joinWaitlist } from "@/lib/waitlist";

/**
 * The /welcome first-run flow: what a new account tells us before it reaches
 * the app.
 *
 * Completion is recorded twice on purpose. The answers go to `user_profiles`
 * because they are data we want to query; the fact that onboarding *happened*
 * goes to Clerk `publicMetadata` because it is read on every authenticated
 * page load and must not cost a database roundtrip.
 */

const INTENTS = new Set<OnboardingIntent>(["shop", "host", "both"]);

const MAX_BRANDS = 24;
const MAX_CATEGORIES = 24;
const MAX_CATEGORY_LENGTH = 64;

export type OnboardingInput = {
  intent: OnboardingIntent;
  brands: string[];
  categories: string[];
  socials: ShowSocials;
};

export function isOnboardingIntent(value: unknown): value is OnboardingIntent {
  return typeof value === "string" && INTENTS.has(value as OnboardingIntent);
}

/** Whether this account has finished /welcome. Metadata only — no DB hit. */
export function hasOnboarded(user: User): boolean {
  return typeof user.publicMetadata?.onboardedAt === "string";
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return profile ?? null;
}

/** Drop anything that was not on the board we rendered. */
function normalizeBrands(brands: string[]): string[] {
  return [...new Set(brands)].filter(isKnownBrandSlug).slice(0, MAX_BRANDS);
}

/**
 * Categories are free text — the picker offers presets but the host-setup
 * pattern this borrows from lets people type their own, so cap rather than
 * reject.
 */
function normalizeCategories(categories: string[]): string[] {
  const cleaned = categories
    .map((item) => item.trim().slice(0, MAX_CATEGORY_LENGTH))
    .filter(Boolean);

  return [...new Set(cleaned)].slice(0, MAX_CATEGORIES);
}

function hasAnySocial(socials: ShowSocials): boolean {
  return Boolean(socials.instagram || socials.tiktok || socials.youtube);
}

/**
 * Records the answers and marks the account onboarded.
 *
 * Idempotent: the profile upserts on `user_id` and `joinWaitlist` upserts on
 * email, so a retried submit edits rather than duplicates.
 *
 * Order matters. The profile row is written before the Clerk flag, because a
 * failure between the two should leave the user *un*-onboarded — they run
 * /welcome again and the upsert absorbs it. Flagging first would strand them
 * in the app with no profile and no way back to the form.
 *
 * Wanting to host files a waitlist application; it never grants hosting.
 * `host_approvals` remains the only thing that opens /host.
 */
export async function completeOnboarding(
  user: User,
  input: OnboardingInput,
): Promise<void> {
  const intent = input.intent;
  const brands = normalizeBrands(input.brands);
  const categories = normalizeCategories(input.categories);

  let waitlistSignupId: string | null = null;

  if (intent !== "shop" && hasAnySocial(input.socials)) {
    const email = user.primaryEmailAddress?.emailAddress?.trim() ?? "";
    // No usable address means no application — but the profile still records
    // that they want to host, so we can reach out another way.
    if (isValidEmail(email)) {
      waitlistSignupId = await joinWaitlist({
        email,
        name: user.fullName,
        socials: input.socials,
        userId: user.id,
      });
    }
  }

  await db
    .insert(userProfiles)
    .values({
      userId: user.id,
      intent,
      brands,
      categories,
      waitlistSignupId,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        intent,
        brands,
        categories,
        // Only overwrite the link when this run actually filed an application.
        // Switching to "just shopping" later must not orphan the earlier one.
        ...(waitlistSignupId ? { waitlistSignupId } : {}),
        updatedAt: new Date(),
      },
    });

  const client = await clerkClient();
  await client.users.updateUserMetadata(user.id, {
    publicMetadata: { onboardedAt: new Date().toISOString() },
  });
}
