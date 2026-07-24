import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { creatorProspects, db } from "@/lib/db";
import type { CreatorProspect, OutreachStatus } from "@/lib/db";
import type { OutreachCounts } from "@/lib/outreach-status";
import { OUTREACH_STATUSES } from "@/lib/outreach-status";
import type { TikTokAccount } from "@/lib/tiktok";

/**
 * The outbound side of host recruiting: creators sourced from TikTok search,
 * their contact address, and how far along the conversation is.
 *
 * Status moves in one direction in practice — new → drafted → contacted →
 * replied → onboarded — with `passed` as the terminal "not a fit". Nothing
 * enforces that order; an admin can set any status from the UI.
 *
 * The status vocabulary itself lives in `@/lib/outreach-status` so the client
 * can import it without pulling the database in.
 */

export type Prospect = CreatorProspect;

/**
 * Save accounts from a search run. Idempotent per (platform, handle): a repeat
 * search refreshes the public profile fields but never touches `status`,
 * `notes`, `contactedAt` or a hand-corrected `email` — those are our data, not
 * TikTok's, and silently resetting them would lose real work.
 */
export async function importProspects(
  accounts: TikTokAccount[],
  discoveredVia: string,
): Promise<number> {
  if (accounts.length === 0) return 0;

  const rows = accounts.map((account) => ({
    platform: "tiktok",
    platformUserId: account.platformUserId,
    handle: account.handle,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    bio: account.bio,
    bioLink: account.bioLink,
    followerCount: account.followerCount,
    verified: account.verified,
    email: account.email,
    discoveredVia,
  }));

  const saved = await db
    .insert(creatorProspects)
    .values(rows)
    .onConflictDoUpdate({
      target: [creatorProspects.platform, creatorProspects.handle],
      set: {
        platformUserId: sql`excluded.platform_user_id`,
        displayName: sql`excluded.display_name`,
        avatarUrl: sql`excluded.avatar_url`,
        bio: sql`excluded.bio`,
        bioLink: sql`excluded.bio_link`,
        followerCount: sql`excluded.follower_count`,
        verified: sql`excluded.verified`,
        // Keep a manually entered address over a re-scraped one.
        email: sql`coalesce(${creatorProspects.email}, excluded.email)`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: creatorProspects.id });

  return saved.length;
}

export async function listProspects(
  status?: OutreachStatus,
): Promise<Prospect[]> {
  const query = db.select().from(creatorProspects);
  const rows = status
    ? await query
        .where(eq(creatorProspects.status, status))
        .orderBy(desc(creatorProspects.followerCount))
    : await query.orderBy(desc(creatorProspects.followerCount));

  return rows;
}

export async function countProspectsByStatus(): Promise<OutreachCounts> {
  const rows = await db
    .select({
      status: creatorProspects.status,
      count: sql<number>`count(*)::int`,
    })
    .from(creatorProspects)
    .groupBy(creatorProspects.status);

  const counts = Object.fromEntries(
    OUTREACH_STATUSES.map((status) => [status, 0]),
  ) as OutreachCounts;

  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

export async function getProspect(id: string): Promise<Prospect | null> {
  const [row] = await db
    .select()
    .from(creatorProspects)
    .where(eq(creatorProspects.id, id))
    .limit(1);

  return row ?? null;
}

export async function updateProspect(
  id: string,
  patch: {
    status?: OutreachStatus;
    email?: string | null;
    notes?: string | null;
    draftSubject?: string | null;
    draftBody?: string | null;
  },
): Promise<Prospect | null> {
  const [row] = await db
    .update(creatorProspects)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(creatorProspects.id, id))
    .returning();

  return row ?? null;
}

/**
 * Record that an email actually went out. Separate from `updateProspect` so the
 * timestamp is only set by the confirm-sent action — a status dropdown
 * shouldn't be able to claim we contacted someone we didn't.
 */
export async function markContacted(
  id: string,
  sent: { subject: string; body: string },
): Promise<Prospect | null> {
  const [row] = await db
    .update(creatorProspects)
    .set({
      status: "contacted",
      draftSubject: sent.subject,
      draftBody: sent.body,
      contactedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(creatorProspects.id, id))
    .returning();

  return row ?? null;
}

export async function deleteProspect(id: string): Promise<void> {
  await db.delete(creatorProspects).where(eq(creatorProspects.id, id));
}
