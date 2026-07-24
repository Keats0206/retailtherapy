"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  MessageCircle,
  Pin,
  Radio,
  ShoppingBag,
  ThumbsUp,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Video,
    title: "Hosts go live",
    description:
      "Open your browser, turn on your camera, and start a show in minutes — no app download required.",
  },
  {
    icon: Pin,
    title: "Pin what you're showing",
    description:
      "Drop products on screen as you shop out loud. Viewers always know exactly what's in frame.",
  },
  {
    icon: ThumbsUp,
    title: "The room decides",
    description:
      "Viewers vote, chat, and shop along in real time. You learn what lands before you ever post a link.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="micro font-bold">
            RetailTherpay
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="micro"
              className="hidden sm:inline-flex"
              render={<Link href="/browse" />}
            >
              Browse shows
            </Button>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" size="micro">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="micro">Get started</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button variant="ghost" size="micro" render={<Link href="/browse" />}>
                Browse
              </Button>
              <Button variant="ghost" size="micro" render={<Link href="/dashboard" />}>
                Dashboard
              </Button>
              <Button
                size="micro"
                className="bg-live text-live-foreground hover:bg-live/90"
                render={<Link href="/host" />}
              >
                Go live
              </Button>
              <UserMenu />
            </Show>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16 lg:py-24">
            <div className="flex flex-col gap-6">
              <h1 className="max-w-lg text-4xl font-normal leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                watch people shop.
              </h1>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                Frontrow is live shopping where the audience weighs in. Hosts
                show what they&rsquo;re buying, pin what&rsquo;s on screen, and
                let the room vote on what&rsquo;s worth it.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" render={<Link href="/browse" />}>
                  Browse live shows
                </Button>
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-pop/30 text-pop hover:bg-pop hover:text-pop-foreground"
                    >
                      Host a show
                    </Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-pop/30 text-pop hover:bg-pop hover:text-pop-foreground"
                    render={<Link href="/host" />}
                  >
                    Host a show
                  </Button>
                </Show>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16 lg:py-20">
            <div className="flex flex-col gap-2">
              <span className="micro text-muted-foreground">How it works</span>
              <h2 className="max-w-md text-2xl font-normal tracking-tight sm:text-3xl">
                Shopping shows with a live audience
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="flex flex-col gap-4 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8"
                >
                  <div className="flex items-center gap-3">
                    <span className="micro text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <step.icon
                      className={cn(
                        "size-4",
                        index === 1 ? "text-pop" : "text-live",
                      )}
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[26px] font-medium">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For viewers / hosts */}
        <section className="border-b border-border">
          <div className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-16 lg:grid-cols-2 lg:py-20">
            <FeaturePanel
              accent="pop"
              eyebrow="For viewers"
              title="Join the room, not just the feed"
              description="Drop into a live show, react in chat, vote on products, and shop along while someone else shops out loud."
              items={[
                { icon: MessageCircle, label: "Live chat with the host and room" },
                { icon: ThumbsUp, label: "Vote on what you'd actually buy" },
                { icon: ShoppingBag, label: "Shop pinned products as they appear" },
              ]}
              cta={{ label: "Find a show", href: "/browse" }}
            />
            <FeaturePanel
              accent="live"
              eyebrow="For hosts"
              title="Go live from your browser"
              description="No studio setup. Open Frontrow, share your link, pin products as you show them, and read the room in real time."
              items={[
                { icon: Video, label: "Stream from your laptop or phone" },
                { icon: Pin, label: "Pin products to the viewer screen" },
                { icon: Radio, label: "See votes and chat while you're live" },
              ]}
              cta={{ label: "Start hosting", href: "/host", host: true }}
            />
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between lg:py-20">
            <div className="flex max-w-lg flex-col gap-2">
              <h2 className="text-2xl font-normal tracking-tight sm:text-3xl">
                Ready to watch — or go live?
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Browse what&rsquo;s streaming now, or sign up and host your first
                show from the browser.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" render={<Link href="/browse" />}>
                Browse live shows
              </Button>
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <Button variant="outline" size="lg">
                    Get started
                  </Button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Button variant="outline" size="lg" render={<Link href="/host" />}>
                  Go live
                </Button>
              </Show>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
          <span className="micro text-muted-foreground">frontrow</span>
          <Link
            href="/browse"
            className="micro text-muted-foreground transition-colors hover:text-foreground"
          >
            Browse shows
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeaturePanel({
  accent,
  eyebrow,
  title,
  description,
  items,
  cta,
}: {
  accent: "live" | "pop";
  eyebrow: string;
  title: string;
  description: string;
  items: { icon: typeof Video; label: string }[];
  cta: { label: string; href: string; host?: boolean };
}) {
  const accentClass = accent === "pop" ? "text-pop" : "text-live";
  const ctaClass =
    accent === "pop"
      ? "border-pop/30 text-pop hover:bg-pop hover:text-pop-foreground"
      : "bg-live text-live-foreground hover:bg-live/90";

  return (
    <div className="flex flex-col gap-6 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8 lg:p-8">
      <div className="flex flex-col gap-2">
        <span className={cn("micro", accentClass)}>{eyebrow}</span>
        <h3 className="text-xl font-normal tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3 text-sm">
            <item.icon
              className={cn("mt-0.5 size-4 shrink-0", accentClass)}
              strokeWidth={1.75}
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      {cta.host ? (
        <Show when="signed-out">
          <SignUpButton mode="modal">
            <Button size="micro" className={cn("mt-auto w-fit", ctaClass)}>
              {cta.label}
            </Button>
          </SignUpButton>
        </Show>
      ) : null}
      {cta.host ? (
        <Show when="signed-in">
          <Button
            size="micro"
            className={cn("mt-auto w-fit", ctaClass)}
            render={<Link href={cta.href} />}
          >
            {cta.label}
          </Button>
        </Show>
      ) : (
        <Button
          size="micro"
          variant="outline"
          className={cn("mt-auto w-fit", ctaClass)}
          render={<Link href={cta.href} />}
        >
          {cta.label}
        </Button>
      )}
    </div>
  );
}
