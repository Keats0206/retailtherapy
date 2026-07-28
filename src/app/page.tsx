import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "frontrow — watch people shop",
  description:
    "Live shopping shows in your browser. Hosts go live, add links as they show them, and let the room decide what's worth buying.",
};

export default async function HomePage() {
  const { isAuthenticated } = await auth();

  if (isAuthenticated) {
    redirect("/home");
  }

  // No manual <link rel="preload"> here: the hero's cards go through
  // next/image, which emits a correctly-sized preload for the priority ones.
  // The old PORTER_HERO_PRELOAD list belonged to a hero this page no longer
  // renders, so it was fetching ~2.4 MB of never-painted images at high
  // priority.
  return <LandingPage />;
}
