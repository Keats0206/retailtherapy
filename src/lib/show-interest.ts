import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db, showInterests } from "@/lib/db";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Register a signed-in viewer as interested in an upcoming show. */
export async function registerInterest(opts: {
  streamId: string;
  userId: string;
}): Promise<{ registered: boolean; total: number }> {
  try {
    await db.insert(showInterests).values({
      streamId: opts.streamId,
      userId: opts.userId,
    });
  } catch {
    // Unique constraint — already registered.
  }

  const total = await getInterestCount(opts.streamId);
  return { registered: true, total };
}

/** Register a guest by email (for viewers who aren't signed in). */
export async function registerInterestByEmail(opts: {
  streamId: string;
  email: string;
}): Promise<{ registered: boolean; total: number }> {
  const email = normalizeEmail(opts.email);
  if (!email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  try {
    await db.insert(showInterests).values({
      streamId: opts.streamId,
      email,
    });
  } catch {
    // Unique constraint — already registered.
  }

  const total = await getInterestCount(opts.streamId);
  return { registered: true, total };
}

export async function getInterestCount(streamId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(showInterests)
    .where(eq(showInterests.streamId, streamId));
  return row?.total ?? 0;
}

export async function hasUserRegisteredInterest(
  streamId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: showInterests.id })
    .from(showInterests)
    .where(
      and(
        eq(showInterests.streamId, streamId),
        eq(showInterests.userId, userId),
      ),
    )
    .limit(1);
  return !!row;
}

/** Emails for reminder delivery — used by the future cron worker. */
export async function listInterestEmails(streamId: string): Promise<string[]> {
  const rows = await db
    .select({ email: showInterests.email, userId: showInterests.userId })
    .from(showInterests)
    .where(eq(showInterests.streamId, streamId));

  // TODO: resolve userId → email via Clerk when sending reminders
  return rows.flatMap((row) => (row.email ? [row.email] : []));
}
