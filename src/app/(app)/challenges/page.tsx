import type { Metadata } from "next";

import { ChallengesSection } from "@/components/challenges-section";
import { listChallenges } from "@/lib/challenges";

export const metadata: Metadata = {
  title: "Challenges · frontrow",
  description:
    "Brand-sponsored shopping events. Take a challenge, go live, and let the room vote on every pick.",
};

export default async function AppChallengesPage() {
  const challenges = await listChallenges();

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-medium tracking-tight sm:text-2xl">
          Challenges
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Brands set the budget and the brief. Hosts go live for at least 30
          minutes — viewers vote on every pick.
        </p>
      </header>

      <ChallengesSection challenges={challenges} />
    </main>
  );
}
