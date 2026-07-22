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
