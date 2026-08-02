"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

import { HeroScatter } from "@/components/hero-scatter";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

export function LandingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-bold uppercase tracking-widest">
            frontrow
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="micro"
              className="hidden sm:inline-flex"
              render={<Link href="/browse" />}
              onClick={() =>
                trackEvent(AnalyticsEvent.NAV_BROWSE, { area: "landing" })
              }
            >
              Browse shows
            </Button>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button
                  variant="ghost"
                  size="micro"
                  onClick={() =>
                    trackEvent(AnalyticsEvent.NAV_SIGN_IN, { area: "landing" })
                  }
                >
                  Sign in
                </Button>
              </SignInButton>
              {/* Land on /home: first-timers get profile setup there. */}
              <SignUpButton
                mode="modal"
                forceRedirectUrl="/home"
                signInForceRedirectUrl="/home"
              >
                <Button
                  variant="secondary"
                  size="micro"
                  onClick={() =>
                    trackEvent(AnalyticsEvent.NAV_SIGN_UP, { area: "landing" })
                  }
                >
                  Get started
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button variant="ghost" size="micro" render={<Link href="/browse" />}>
                Browse
              </Button>
              <Button variant="ghost" size="micro" render={<Link href="/home" />}>
                Home
              </Button>
              <Button
                size="micro"
                className="bg-live text-live-foreground hover:bg-live/90"
                render={<Link href="/host/setup" />}
                onClick={() =>
                  trackEvent(AnalyticsEvent.NAV_GO_LIVE, { area: "landing" })
                }
              >
                Go live
              </Button>
              <UserMenu />
            </Show>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <HeroScatter />
      </main>

      <footer>
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
          <span className="micro text-muted-foreground">frontrow</span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="micro text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="micro text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/browse"
              className="micro text-muted-foreground transition-colors hover:text-foreground"
            >
              Browse shows
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
