import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";

/**
 * Returns the current Clerk user when signed in, otherwise `null`. Use in
 * Server Components, Route Handlers, and Server Actions to gate host-only
 * functionality.
 */
export async function getHostUser(): Promise<User | null> {
  return currentUser();
}

export async function isHost(): Promise<boolean> {
  return (await getHostUser()) !== null;
}

/** Built-in super admins — always have admin access when signed in. */
const BUILTIN_SUPER_ADMIN_USERNAMES = new Set(["keats0206"]);

/**
 * Returns the current Clerk user when signed in and allowed as admin, otherwise
 * `null`. Super admins (username allowlist) and `ADMIN_ALLOWLIST` emails both
 * qualify. Use for ops actions like force-ending a live show.
 */
export async function getAdminUser(): Promise<User | null> {
  const user = await currentUser();
  if (!user) return null;
  if (!isUserAllowlistedAsAdmin(user)) return null;
  return user;
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

export function isUserAllowlistedAsAdmin(user: User): boolean {
  const username = clerkUsername(user);
  if (username && isSuperAdminUsername(username)) return true;

  const allowlist = getAdminAllowlist();
  if (!allowlist) return false;

  const email = primaryEmail(user);
  return email !== null && allowlist.has(email);
}

export function isSuperAdmin(user: User): boolean {
  const username = clerkUsername(user);
  return username !== null && isSuperAdminUsername(username);
}

/** Signed-in user, regardless of allowlist. */
export async function getSignedInUser(): Promise<User | null> {
  return currentUser();
}

/** LiveKit chat display name for a signed-in viewer (server-derived). */
export function getViewerChatName(user: User): string {
  const username = clerkUsername(user);
  if (username) return username;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full.slice(0, 32);
  const email = primaryEmail(user);
  if (email) return email.split("@")[0]!.slice(0, 32);
  return "Viewer";
}

function getAdminAllowlist(): Set<string> | null {
  return parseEmailAllowlist(process.env.ADMIN_ALLOWLIST);
}

function getSuperAdminUsernames(): Set<string> | null {
  return parseUsernameAllowlist(process.env.SUPER_ADMIN_USERNAMES);
}

function isSuperAdminUsername(username: string): boolean {
  if (BUILTIN_SUPER_ADMIN_USERNAMES.has(username)) return true;
  const allowlist = getSuperAdminUsernames();
  return allowlist?.has(username) ?? false;
}

function clerkUsername(user: User): string | null {
  return user.username?.trim().toLowerCase() ?? null;
}

function parseUsernameAllowlist(raw: string | undefined): Set<string> | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const usernames = trimmed
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return usernames.length > 0 ? new Set(usernames) : null;
}

function parseEmailAllowlist(raw: string | undefined): Set<string> | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const emails = trimmed
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
