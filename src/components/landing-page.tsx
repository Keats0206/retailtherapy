"use client";

import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

import { ChallengesSection } from "@/components/challenges-section";
import { Button } from "@/components/ui/button";
import type { ChallengeCard as Challenge } from "@/lib/challenges";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

/**
 * Public landing — challenges only. The full discovery feed (live shows, your
 * shows, recaps) lives at /home behind sign-in.
 */
export function LandingPage({ challenges }: { challenges: Challenge[] }) {
  return (
    <main className="flex w-full flex-1 flex-col gap-10 px-4 py-6 sm:px-6 lg:gap-14 lg:py-10">
      <header className="flex max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-3">
          <span className="micro text-muted-foreground">Brand challenges</span>
          <h1 className="max-w-2xl text-3xl font-normal leading-tight tracking-tight sm:text-4xl lg:leading-[1.08]">
            Take the challenge. Go live. Let the room decide.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Brands set the budget and the brief. Hosts shop live on camera for
            at least 30 minutes while viewers vote on every pick. Sign up to
            host — watching is always free.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SignUpButton mode="modal">
            <Button
              size="sm"
              onClick={() =>
                trackEvent(AnalyticsEvent.NAV_SIGN_UP, { area: "landing" })
              }
            >
              Get started
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                trackEvent(AnalyticsEvent.NAV_SIGN_IN, { area: "landing" })
              }
            >
              Sign in
            </Button>
          </SignInButton>
        </div>
      </header>

      <ChallengesSection challenges={challenges} />

      <section className="soft-panel mt-auto flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="micro text-muted-foreground">Already a member?</span>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Sign in for live shows, your host dashboard, saved picks, and every
            recap.
          </p>
        </div>
        <Button
          size="micro"
          className="w-fit"
          render={<Link href="/sign-in" />}
        >
          Go to app
        </Button>
      </section>
    </main>
  );
}
