"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { ArrowUpRight, Bell } from "lucide-react";

import { ShowTrailPreview } from "@/components/show-trail-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PROTOTYPE_CHAT_LINES } from "@/lib/cinema/prototype-catalog";
import type { TrailPreviewItem } from "@/lib/shows";
import { cn } from "@/lib/utils";

/**
 * Browse, prototype edition. Reproduces the production /browse layout on
 * canned data (no database) and layers on the three concepts under review:
 *
 *   1. An "Upcoming" schedule between Live now and Past shows — theme, tags,
 *      creator, and go-live time, soonest first.
 *   2. A redesigned empty live state that sells the next show and converts:
 *      "Get notified" / "Host a show now", both feeding Clerk sign-up.
 *   3. A join gate: clicking any show opens its preview surface with the
 *      "Create your account" modal on top (signed-out only).
 */

type PastShow = {
  slug: string;
  title: string;
  host: string;
  endedAtLabel: string;
  pinnedProduct?: string;
  thumbnailUrl: string;
  trail: TrailPreviewItem[];
  trailExtraCount: number;
};

type UpcomingShow = {
  slug: string;
  theme: string;
  host: string;
  tags: string[];
  startsAt: Date;
};

type Preview =
  | { kind: "past"; show: PastShow }
  | { kind: "upcoming"; show: UpcomingShow };

/** Same trick as `discoveryThumbnail` in lib/shows — a labeled SVG data URI,
 * so the prototype needs no image hosting. */
function thumb(label: string, tone = 18): string {
  const bg = `hsl(0 0% ${tone}%)`;
  const fg = tone > 50 ? "#00000055" : "#ffffff88";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="${bg}"/><text x="320" y="188" fill="${fg}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" letter-spacing="3" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function swatch(color: string, name: string): TrailPreviewItem {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${color}"/></svg>`;
  return { name, imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` };
}

const PAST_SHOWS: PastShow[] = [
  {
    slug: "heatwave-haul",
    title: "heatwave haul",
    host: "Morgan Baker",
    endedAtLabel: "Jul 31, 2026",
    pinnedProduct: "Floral Print Parka",
    thumbnailUrl: thumb("REPLAY", 88),
    trail: [
      swatch("#8c5a4f", "Floral print parka"),
      swatch("#2f3a4a", "Barrel leg jean"),
      swatch("#d9c8b4", "Ribbed crew knit"),
      swatch("#6b6f5a", "Silk slip skirt"),
    ],
    trailExtraCount: 3,
  },
  {
    slug: "no-agenda-leon",
    title: "no agenda, all links",
    host: "Leon Mueller",
    endedAtLabel: "Jul 31, 2026",
    pinnedProduct: "728 High-rise Wide-leg Women’s Jeans",
    thumbnailUrl: thumb("REPLAY", 92),
    trail: [swatch("#3d4a63", "Wide-leg jeans")],
    trailExtraCount: 0,
  },
  {
    slug: "no-agenda-katharina",
    title: "no agenda, all links",
    host: "Katharina",
    endedAtLabel: "Jul 31, 2026",
    thumbnailUrl: thumb("RECAP", 18),
    trail: [],
    trailExtraCount: 0,
  },
  {
    slug: "office-core",
    title: "office-core, but fun",
    host: "Morgan Baker",
    endedAtLabel: "Jul 29, 2026",
    pinnedProduct: "Wool blend car coat",
    thumbnailUrl: thumb("REPLAY", 84),
    trail: [
      swatch("#44403c", "Wool blend car coat"),
      swatch("#a8a29e", "Ribbed crew knit"),
    ],
    trailExtraCount: 0,
  },
  {
    slug: "five-dresses",
    title: "5 dresses, 1 night",
    host: "Katharina",
    endedAtLabel: "Jul 28, 2026",
    pinnedProduct: "Silk slip skirt",
    thumbnailUrl: thumb("REPLAY", 90),
    trail: [
      swatch("#7c2d3e", "Silk slip dress"),
      swatch("#1c1917", "Leather ballet flat"),
      swatch("#e7e5e4", "Satin midi"),
      swatch("#57534e", "Wrap dress"),
    ],
    trailExtraCount: 1,
  },
  {
    slug: "sneaker-reset",
    title: "sneaker rotation reset",
    host: "Leon Mueller",
    endedAtLabel: "Jul 27, 2026",
    thumbnailUrl: thumb("RECAP", 22),
    trail: [],
    trailExtraCount: 0,
  },
];

function dayLabel(date: Date): string {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(date) - startOfDay(new Date())) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BrowsePagePrototype() {
  const { isSignedIn } = useUser();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  // Set when a gate CTA hands off to Clerk's auth modal: the gate closes but
  // the show preview should stay put behind it.
  const keepPreviewRef = useRef(false);

  // Dummy schedule, dated relative to today so the rail always reads
  // "Tomorrow / Fri / Sun" and the soonest show stays on top.
  const upcomingShows = useMemo<UpcomingShow[]>(() => {
    const at = (days: number, hours: number, minutes = 0) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };
    return [
      {
        slug: "fall-layering",
        theme: "fall layering, zero gatekeeping",
        host: "Morgan Baker",
        tags: ["outerwear", "under $150"],
        startsAt: at(1, 18),
      },
      {
        slug: "denim-deep-dive",
        theme: "denim deep dive",
        host: "Leon Mueller",
        tags: ["denim", "fit checks"],
        startsAt: at(3, 15),
      },
      {
        slug: "wedding-guest-szn",
        theme: "wedding guest szn",
        host: "Katharina",
        tags: ["occasionwear", "rentals"],
        startsAt: at(5, 19, 30),
      },
    ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, []);
  const nextShow = upcomingShows[0];

  const openShow = (next: Preview) => {
    setPreview(next);
    setGateOpen(!isSignedIn);
  };

  const handleGateOpenChange = (open: boolean) => {
    setGateOpen(open);
    if (!open) {
      if (keepPreviewRef.current) keepPreviewRef.current = false;
      else setPreview(null);
    }
  };

  const continueToAuth = () => {
    keepPreviewRef.current = true;
    setGateOpen(false);
  };

  useEffect(() => {
    if (!preview || gateOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, gateOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-2">
            <Link href="/" className="text-base font-bold uppercase tracking-widest">
              frontrow
            </Link>
            <Badge variant="secondary" size="micro">
              browse prototype
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
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
              <Button size="micro" render={<Link href="/host/setup" />}>
                Go live
              </Button>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-10 lg:py-14">
        <section className="flex flex-col gap-3">
          <h1 className="max-w-2xl text-3xl font-normal leading-tight tracking-tight sm:text-4xl lg:text-4xl lg:leading-[1.08]">
            watch people shop.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Live shopping shows happening now. Join the room, vote on what
            you&rsquo;d buy, and shop along while hosts show what they&rsquo;re buying.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="micro text-muted-foreground">Live now</h2>
          <div className="soft-panel flex flex-col gap-5 p-6 sm:p-7">
            <div className="flex flex-col gap-1.5">
              <p className="text-base">No one&rsquo;s live right now.</p>
              <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                Next up: {nextShow.theme} with {nextShow.host} —{" "}
                {dayLabel(nextShow.startsAt)} at {timeLabel(nextShow.startsAt)}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <Button size="sm">
                    <Bell className="size-4" />
                    Get notified when the next shows go live
                  </Button>
                </SignUpButton>
                <SignUpButton mode="modal">
                  <Button size="sm" variant="outline">
                    Host a show now
                  </Button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Button size="sm" className="w-fit" render={<Link href="/host/setup" />}>
                  Go live now
                </Button>
              </Show>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="micro text-muted-foreground">Upcoming</h2>
            <span className="micro text-muted-foreground">
              {upcomingShows.length} scheduled
            </span>
          </div>
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/8">
            {upcomingShows.map((show, index) => (
              <button
                key={show.slug}
                type="button"
                onClick={() => openShow({ kind: "upcoming", show })}
                className="group flex w-full items-start gap-4 bg-card px-4 py-4 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring sm:items-center sm:gap-5 sm:px-5"
              >
                <span
                  className="flex w-24 shrink-0 flex-col gap-0.5"
                  suppressHydrationWarning
                >
                  <span className="text-sm font-medium">{dayLabel(show.startsAt)}</span>
                  <span className="text-sm text-muted-foreground">
                    {timeLabel(show.startsAt)}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base leading-snug">{show.theme}</span>
                    {index === 0 ? (
                      <Badge size="micro" className="shrink-0">
                        Next up
                      </Badge>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm text-muted-foreground">{show.host}</span>
                    {show.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" size="micro">
                        {tag}
                      </Badge>
                    ))}
                  </span>
                </span>
                <span className="micro hidden shrink-0 items-center gap-1.5 text-muted-foreground transition-colors group-hover:text-foreground sm:flex">
                  <Bell className="size-3.5" />
                  Remind me
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="micro text-muted-foreground">Past shows</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAST_SHOWS.map((show) => (
              <PastShowCard
                key={show.slug}
                show={show}
                onOpen={() => openShow({ kind: "past", show })}
              />
            ))}
          </div>
        </section>

        <section className="mt-auto flex flex-col gap-4 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="micro text-muted-foreground">Become a Host</span>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Go live from your browser, add links as you show them, and let
              the room decide what&rsquo;s worth buying.
            </p>
          </div>
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <Button size="micro" className="w-fit">
                Apply to be a host
              </Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Button size="micro" className="w-fit" render={<Link href="/host/setup" />}>
              Go live
            </Button>
          </Show>
        </section>
      </main>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
          <span className="micro text-muted-foreground">frontrow</span>
          <div className="flex items-center gap-4">
            <span className="micro text-muted-foreground">canned data</span>
            <Link
              href="/v2/studio"
              className="micro text-muted-foreground hover:text-foreground"
            >
              cinema studio prototype
            </Link>
          </div>
        </div>
      </footer>

      {preview ? (
        <ShowPreviewTakeover preview={preview} onClose={() => setPreview(null)} />
      ) : null}

      <Dialog open={gateOpen} onOpenChange={handleGateOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <span className="micro text-muted-foreground">Get started</span>
            <DialogTitle className="text-lg">
              Create your account to keep watching
            </DialogTitle>
            <DialogDescription>
              Frontrow is free. An account lets you watch every show, vote on
              what&rsquo;s on screen, and shop the links hosts drop.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <SignUpButton mode="modal">
              <Button className="w-full" onClick={continueToAuth}>
                Create your account
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button variant="ghost" className="w-full" onClick={continueToAuth}>
                I already have an account — sign in
              </Button>
            </SignInButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PastShowCard({
  show,
  onOpen,
}: {
  show: PastShow;
  onOpen: () => void;
}) {
  return (
    <Card className="overflow-hidden py-0 ring-foreground/8 transition-colors hover:ring-foreground/15">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={show.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <Badge variant="secondary" size="micro" className="absolute left-3 top-3">
            {show.endedAtLabel}
          </Badge>
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            {show.trail.length > 0 ? (
              <ShowTrailPreview items={show.trail} extraCount={show.trailExtraCount} />
            ) : null}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-normal">{show.title}</CardTitle>
              <CardDescription>{show.host}</CardDescription>
            </div>
          </div>
        </CardHeader>

        {show.pinnedProduct ? (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              On screen:{" "}
              <span className="text-foreground">{show.pinnedProduct}</span>
            </p>
          </CardContent>
        ) : null}

        <CardFooter className={cn(!show.pinnedProduct && "border-t-0")}>
          <span className="micro text-muted-foreground">Watch replay</span>
        </CardFooter>
      </button>
    </Card>
  );
}

/** The "show opens" surface behind the join gate — a lightweight stand-in for
 * /s/<slug> (replay) or the waitroom (upcoming), on canned data. */
function ShowPreviewTakeover({
  preview,
  onClose,
}: {
  preview: Preview;
  onClose: () => void;
}) {
  const isUpcoming = preview.kind === "upcoming";
  const title = isUpcoming ? preview.show.theme : preview.show.title;
  const host = preview.show.host;
  const stageThumb = isUpcoming
    ? thumb("UPCOMING", 14)
    : preview.show.thumbnailUrl;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold uppercase tracking-widest">
              frontrow
            </span>
            <Badge variant="secondary" size="micro">
              show preview
            </Badge>
          </div>
          <Button variant="ghost" size="micro" onClick={onClose}>
            Back to browse
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stageThumb} alt="" className="h-full w-full object-cover" />
          <div className="cinema-scrim-bottom absolute inset-x-0 bottom-0 h-2/3" />

          <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
            {isUpcoming ? (
              <Badge size="micro" suppressHydrationWarning>
                Starts {dayLabel(preview.show.startsAt)} ·{" "}
                {timeLabel(preview.show.startsAt)}
              </Badge>
            ) : (
              <Badge variant="secondary" size="micro">
                Replay · {preview.show.endedAtLabel}
              </Badge>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4 sm:p-6">
            <h2 className="text-2xl font-normal leading-tight tracking-tight text-white sm:text-3xl">
              {title}
            </h2>
            <p className="text-sm text-white/75" suppressHydrationWarning>
              {host}
              {isUpcoming
                ? ` · going live ${dayLabel(preview.show.startsAt)} at ${timeLabel(preview.show.startsAt)}`
                : preview.show.pinnedProduct
                  ? ` · on screen: ${preview.show.pinnedProduct}`
                  : null}
            </p>
          </div>
        </div>

        {isUpcoming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {host} will go live here.
            </span>
            {preview.show.tags.map((tag) => (
              <Badge key={tag} variant="secondary" size="micro">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {preview.show.trail.length > 0 ? (
              <div className="flex items-center gap-3">
                <ShowTrailPreview
                  items={preview.show.trail}
                  extraCount={preview.show.trailExtraCount}
                />
                <span className="text-sm text-muted-foreground">
                  Shopping trail from this show
                </span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {PROTOTYPE_CHAT_LINES.slice(0, 4).map((line) => (
                <span
                  key={line.author}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-sm text-muted-foreground"
                >
                  <span className="font-medium text-foreground">{line.author}</span>
                  {line.text}
                </span>
              ))}
            </div>
          </div>
        )}

        <span className="micro inline-flex items-center gap-1 text-muted-foreground">
          Prototype preview — the real thing lives at /s/&lt;slug&gt;
          <ArrowUpRight className="size-3" />
        </span>
      </div>
    </div>
  );
}
