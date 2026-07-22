import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";

/**
 * Returns the current Clerk user when signed in, otherwise `null`. Use in
 * Server Components, Route Handlers, and Server Actions to gate host-only
 * functionality.
 *
 * When `HOST_ALLOWLIST` is set, only listed email addresses can host. An empty
 * or unset allowlist lets any signed-in user host.
 */
export async function getHostUser(): Promise<User | null> {
  const user = await currentUser();
  if (!user) return null;
  if (!isUserAllowlistedToHost(user)) return null;
  return user;
}

export async function isHost(): Promise<boolean> {
  return (await getHostUser()) !== null;
}

/** Signed-in user, regardless of allowlist. */
export async function getSignedInUser(): Promise<User | null> {
  return currentUser();
}

export function isUserAllowlistedToHost(user: User): boolean {
  const allowlist = getHostAllowlist();
  if (!allowlist) return true;

  const email = primaryEmail(user);
  return email !== null && allowlist.has(email);
}

function getHostAllowlist(): Set<string> | null {
  const raw = process.env.HOST_ALLOWLIST?.trim();
  if (!raw) return null;

  const emails = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return emails.length > 0 ? new Set(emails) : null;
}

function primaryEmail(user: User): string | null {
  const email =
    user.emailAddresses.find(
      (entry) => entry.id === user.primaryEmailAddressId,
    )?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

  return email?.toLowerCase() ?? null;
}
