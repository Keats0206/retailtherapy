import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";

import { HeroScatter } from "@/components/hero-scatter";
import { isHostingApproved } from "@/lib/auth";

export const metadata: Metadata = {
  title: "frontrow — watch people shop",
  description:
    "Hosts go live, add links to what's on screen, and let the room vote on what's worth it.",
};

/** Public landing — scatter hero with browse as the primary CTA. */
export default async function PublicLandingPage() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const canHost = user ? await isHostingApproved(user) : false;

  return (
    <main className="flex flex-1 items-center justify-center">
      <HeroScatter canHost={canHost} />
    </main>
  );
}
