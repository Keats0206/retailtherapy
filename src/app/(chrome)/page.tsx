import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing-page";
import { listChallenges } from "@/lib/challenges";

export const metadata: Metadata = {
  title: "frontrow — brand challenges",
  description:
    "Take a brand challenge, go live, and let the room vote on every pick.",
};

/** Public landing — challenges only. Signed-in members go straight to the app. */
export default async function PublicLandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/home");

  const challenges = await listChallenges();

  return <LandingPage challenges={challenges} />;
}
