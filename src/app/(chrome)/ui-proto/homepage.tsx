"use client";

import Link from "next/link";

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
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  MOCK_LIVE_SHOWS,
  MOCK_UPCOMING_SHOWS,
  type LiveShow,
} from "@/lib/mock-home-data";

export default function Homepage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8">
      <section className="flex flex-col gap-4 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="micro text-muted-foreground">Show creator</span>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Prep your camera, open store tabs, preview the viewer page — then go
            live from the browser.
          </p>
        </div>
        <Link href="/ui-proto/go-live">
          <Button size="micro" className="w-fit bg-live text-live-foreground hover:bg-live/90">
            Go live
          </Button>
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="micro text-muted-foreground">Live now</h2>
          <span className="micro inline-flex items-center gap-2 text-live">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
            {MOCK_LIVE_SHOWS.length} streaming
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_LIVE_SHOWS.map((show) => (
            <ShowCard key={show.slug} show={show} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-10">
        <h2 className="micro text-muted-foreground">Starting soon</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MOCK_UPCOMING_SHOWS.map((show) => (
            <ShowCard key={show.slug} show={show} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ShowCard({ show }: { show: LiveShow }) {
  return (
    <Card className="overflow-hidden py-0 ring-foreground/8 transition-colors hover:ring-foreground/15">
      <Link
        href={`/ui-proto/show/${show.slug}`}
        className="flex w-full flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <img
            src={show.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          {show.isLive ? (
            <Badge
              variant="destructive"
              size="micro"
              className="absolute left-3 top-3 bg-live text-live-foreground"
            >
              Live
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              size="micro"
              className="absolute left-3 top-3"
            >
              Soon
            </Badge>
          )}
          {show.isLive ? (
            <span className="micro absolute bottom-3 right-3 rounded-md bg-background/90 px-2 py-1 tabular-nums text-foreground backdrop-blur-sm">
              {formatCount(show.viewers)} watching
            </span>
          ) : null}
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-base font-normal">{show.title}</CardTitle>
          <CardDescription>
            {show.host} · {show.category}
          </CardDescription>
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
          <span className="micro text-muted-foreground">
            {show.isLive ? "Join show" : "Set reminder"}
          </span>
        </CardFooter>
      </Link>
    </Card>
  );
}
