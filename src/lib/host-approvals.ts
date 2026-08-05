import "server-only";

import { eq, or, sql } from "drizzle-orm";

import {
  db,
  hostApprovals,
  type HostApprovalSource,
  type WaitlistStatus,
  waitlistSignups,
} from "@/lib/db";

export type WaitlistSignupView = {
  id: string;
  email: string;
  name: string | null;
  handle: string | null;
  pitch: string | null;
  socials: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  } | null;
  userId: string | null;
  status: WaitlistStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WaitlistCounts = Record<WaitlistStatus, number> & { all: number };

function toView(row: typeof waitlistSignups.$inferSelect): WaitlistSignupView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    handle: row.handle,
    pitch: row.pitch,
    socials: row.socials,
    userId: row.userId,
    status: row.status,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedBy: row.reviewedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function hasHostingApproval(input: {
  userId?: string | null;
  emails?: string[];
}): Promise<boolean> {
  const emails = (input.emails ?? [])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const userId = input.userId?.trim() || null;

  if (!userId && emails.length === 0) return false;

  const conditions = [];
  if (userId) conditions.push(eq(hostApprovals.userId, userId));
  for (const email of emails) {
    conditions.push(eq(hostApprovals.email, email));
  }

  const [row] = await db
    .select({ id: hostApprovals.id })
    .from(hostApprovals)
    .where(or(...conditions))
    .limit(1);

  return Boolean(row);
}

export async function grantHostingApproval(input: {
  email: string;
  userId?: string | null;
  source: HostApprovalSource;
  waitlistSignupId?: string | null;
  grantedBy?: string | null;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const userId = input.userId?.trim() || null;
  const now = new Date();

  const values = {
    email,
    userId,
    source: input.source,
    waitlistSignupId: input.waitlistSignupId ?? null,
    grantedBy: input.grantedBy ?? null,
    grantedAt: now,
  };

  if (userId) {
    await db
      .insert(hostApprovals)
      .values(values)
      .onConflictDoUpdate({
        target: hostApprovals.userId,
        set: {
          email,
          source: input.source,
          waitlistSignupId: input.waitlistSignupId ?? null,
          grantedBy: input.grantedBy ?? null,
          grantedAt: now,
        },
      });
    return;
  }

  await db
    .insert(hostApprovals)
    .values(values)
    .onConflictDoUpdate({
      target: hostApprovals.email,
      set: {
        userId,
        source: input.source,
        waitlistSignupId: input.waitlistSignupId ?? null,
        grantedBy: input.grantedBy ?? null,
        grantedAt: now,
      },
    });
}

export async function listWaitlistSignups(options?: {
  status?: WaitlistStatus | "all";
}): Promise<{ signups: WaitlistSignupView[]; counts: WaitlistCounts }> {
  const rows = await db
    .select()
    .from(waitlistSignups)
    .orderBy(sql`${waitlistSignups.createdAt} desc`);

  const counts: WaitlistCounts = {
    pending: 0,
    approved: 0,
    declined: 0,
    all: rows.length,
  };

  for (const row of rows) {
    counts[row.status] += 1;
  }

  const status = options?.status ?? "all";
  const filtered =
    status === "all" ? rows : rows.filter((row) => row.status === status);

  return {
    signups: filtered.map(toView),
    counts,
  };
}

export async function reviewWaitlistSignup(
  id: string,
  action: "approve" | "decline",
  adminUserId: string,
): Promise<WaitlistSignupView | null> {
  const [signup] = await db
    .select()
    .from(waitlistSignups)
    .where(eq(waitlistSignups.id, id))
    .limit(1);

  if (!signup) return null;

  const now = new Date();
  const status: WaitlistStatus =
    action === "approve" ? "approved" : "declined";

  const [updated] = await db
    .update(waitlistSignups)
    .set({
      status,
      reviewedAt: now,
      reviewedBy: adminUserId,
      updatedAt: now,
    })
    .where(eq(waitlistSignups.id, id))
    .returning();

  if (!updated) return null;

  if (action === "approve") {
    await grantHostingApproval({
      email: updated.email,
      userId: updated.userId,
      source: "waitlist",
      waitlistSignupId: updated.id,
      grantedBy: adminUserId,
    });
  }

  return toView(updated);
}

export async function countPendingWaitlistSignups(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waitlistSignups)
    .where(eq(waitlistSignups.status, "pending"));

  return row?.count ?? 0;
}
