import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";

// Only these emails may create/host live streams. Override with a
// comma-separated HOST_ALLOWLIST env var; defaults to the app owner.
const HOST_ALLOWLIST = (process.env.HOST_ALLOWLIST ?? "keats0206@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedHostEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return HOST_ALLOWLIST.includes(email.toLowerCase());
}

/**
 * Returns the current Clerk user only if they are an allowed host, otherwise
 * `null`. Use in Server Components, Route Handlers, and Server Actions to gate
 * host-only functionality.
 */
export async function getHostUser(): Promise<User | null> {
  const user = await currentUser();
  if (!user) return null;
  return isAllowedHostEmail(user.primaryEmailAddress?.emailAddress)
    ? user
    : null;
}

export async function isHost(): Promise<boolean> {
  return (await getHostUser()) !== null;
}
