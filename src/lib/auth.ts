import "server-only";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
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

/** Built-in admin emails — always have admin access when signed in. */
const BUILTIN_ADMIN_EMAILS = new Set([
  "keats0206@gmail.com",
  "leon@boldenadvisors.com",
]);

export type AdminAccess =
  | { status: "granted"; user: User }
  | {
      status: "denied";
      user: User;
      emails: string[];
      username: string | null;
    }
  | { status: "unauthenticated" };

/**
 * Returns the current Clerk user when signed in and allowed as admin, otherwise
 * `null`. Super admins (username allowlist), built-in admin emails, and
 * `ADMIN_ALLOWLIST` emails all qualify. Use for ops actions like force-ending
 * a live show.
 */
export async function getAdminUser(): Promise<User | null> {
  const access = await getAdminAccess();
  return access.status === "granted" ? access.user : null;
}

export async function getAdminAccess(): Promise<AdminAccess> {
  const user = await resolveClerkUserForAdmin();
  if (!user) return { status: "unauthenticated" };

  const emails = userEmails(user);
  const username = clerkUsername(user);

  if (isUserAllowlistedAsAdmin(user, emails, username)) {
    return { status: "granted", user };
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[admin] access denied", { username, emails, userId: user.id });
  }

  return { status: "denied", user, emails, username };
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

export function isUserAllowlistedAsAdmin(
  user: User,
  emails = userEmails(user),
  username = clerkUsername(user),
): boolean {
  if (username && isSuperAdminUsername(username)) return true;
  if (emails.some((email) => BUILTIN_ADMIN_EMAILS.has(email))) return true;

  const allowlist = getAdminAllowlist();
  if (!allowlist) return false;

  return emails.some((email) => allowlist.has(email));
}

export function isSuperAdmin(user: User): boolean {
  const username = clerkUsername(user);
  return username !== null && isSuperAdminUsername(username);
}

/** Signed-in user, regardless of allowlist. */
export async function getSignedInUser(): Promise<User | null> {
  return currentUser();
}

async function resolveClerkUserForAdmin(): Promise<User | null> {
  const user = await currentUser();
  if (!user) return null;
  if (userEmails(user).length > 0) return user;

  try {
    const client = await clerkClient();
    return await client.users.getUser(user.id);
  } catch (error) {
    console.error("[admin] failed to load Clerk user profile", error);
    return user;
  }
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

function userEmails(user: User): string[] {
  return user.emailAddresses
    .map((entry) => entry.emailAddress.trim().toLowerCase())
    .filter(Boolean);
}
