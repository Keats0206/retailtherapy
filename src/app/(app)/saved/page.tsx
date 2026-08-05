import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { listSavedItems, listSavedShows } from "@/lib/saved";
import { SavedClient } from "./saved-client";

export const metadata: Metadata = {
  title: "Saved · frontrow",
  description: "Everything you've saved to shop later.",
};

/**
 * The viewer's board. Private by construction: it only ever renders the
 * signed-in user's own saves, and there is no route that renders anyone
 * else's.
 *
 * `src/proxy.ts` already gates /saved, so the redirect here is the belt to
 * that braces — it also covers a direct render if the matcher ever changes.
 */
export default async function SavedPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [items, shows] = await Promise.all([
    listSavedItems(userId),
    listSavedShows(userId),
  ]);

  return <SavedClient items={items} shows={shows} />;
}
