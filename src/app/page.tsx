import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing-page";
import { PORTER_HERO_PRELOAD } from "@/lib/landing-porter-outfits";

export const metadata: Metadata = {
  title: "frontrow — watch people shop",
  description:
    "Live shopping shows in your browser. Hosts go live, add links as they show them, and let the room decide what's worth buying.",
};

export default async function HomePage() {
  const { isAuthenticated } = await auth();

  if (isAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <>
      {PORTER_HERO_PRELOAD.map((href) => (
        <link key={href} rel="preload" as="image" href={href} />
      ))}
      <LandingPage />
    </>
  );
}
