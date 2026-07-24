/**
 * Outreach pipeline vocabulary, shared by the server data layer and the admin
 * client component.
 *
 * Deliberately free of `server-only` and of any database import: the client
 * bundle needs the labels and the row shape, and pulling in `@/lib/db` for them
 * would drag drizzle and the Neon driver along with it.
 */

export const OUTREACH_STATUSES = [
  "new",
  "drafted",
  "contacted",
  "replied",
  "onboarded",
  "passed",
] as const;

export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  new: "New",
  drafted: "Drafted",
  contacted: "Contacted",
  replied: "Replied",
  onboarded: "Onboarded",
  passed: "Passed",
};

/**
 * A prospect as the client sees it. Timestamps are `Date` when handed straight
 * to a Server Component's props and `string` when they've been through
 * `Response.json`, so both are allowed here — read them with `new Date(...)`.
 */
export type ProspectView = {
  id: string;
  platform: string;
  platformUserId: string | null;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  bioLink: string | null;
  followerCount: number;
  verified: boolean;
  email: string | null;
  discoveredVia: string | null;
  status: OutreachStatus;
  draftSubject: string | null;
  draftBody: string | null;
  notes: string | null;
  contactedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type OutreachCounts = Record<OutreachStatus, number>;

/**
 * Gmail's compose URL, pre-filled with the draft.
 *
 * Outreach is sent by hand from the admin's own Gmail rather than through a
 * transactional provider: it needs no sending domain, it arrives from a real
 * person's address, and replies land in a normal inbox thread. The trade-off is
 * that the app can't observe the send — hence the separate "mark as sent" step.
 */
export function gmailComposeUrl({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
