"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { EndLiveShowButton } from "@/components/end-live-show-button";
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
import type { DiscoveryShow } from "@/lib/shows";
import { cn } from "@/lib/utils";

export function BrowsePage({
  liveShows,
  isAdmin = false,
}: {
  liveShows: DiscoveryShow[];
  isAdmin?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-bold uppercase tracking-widest">
            frontrow
          </Link>
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
              <Button variant="ghost" size="micro" render={<Link href="/dashboard" />}>
                Dashboard
              </Button>
              <Button size="micro" render={<Link href="/host" />}>
                Go live
              </Button>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-10 lg:py-14">
        <section className="flex flex-col gap-3">
          <h1 className="max-w-2xl text-3xl font-normal leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
            watch people shop.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Live shopping shows happening now. Join the room, vote on what
            you&rsquo;d buy, and shop along while hosts show what they&rsquo;re buying.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="micro text-muted-foreground">Live now</h2>
            {liveShows.length > 0 ? (
              <span className="micro inline-flex items-center gap-2 text-live">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                {liveShows.length} streaming
              </span>
            ) : null}
          </div>

          {liveShows.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveShows.map((show) => (
                <ShowCard key={show.slug} show={show} isAdmin={isAdmin} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-muted/40 p-6 text-sm leading-relaxed text-muted-foreground ring-1 ring-foreground/8">
              <Show when="signed-out">
                No one is live right now. Hosts can go live from the browser — sign
                in and hit Go live when you&rsquo;re ready.
              </Show>
              <Show when="signed-in">
                No one is live right now.{" "}
                <Link
                  href="/host"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Go live
                </Link>{" "}
                from your browser when you&rsquo;re ready.
              </Show>
            </div>
          )}
        </section>

        <section className="mt-auto flex flex-col gap-4 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="micro text-muted-foreground">Host a show</span>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Go live from your browser, add links as you show them, and let
              the room decide what&rsquo;s worth buying.
            </p>
          </div>
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <Button size="micro" className="w-fit">
                Get started
              </Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Button size="micro" className="w-fit" render={<Link href="/host" />}>
              Go live
            </Button>
          </Show>
        </section>
      </main>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl px-6 py-8">
          <span className="micro text-muted-foreground">frontrow</span>
        </div>
      </footer>
    </div>
  );
}

function ShowCard({
  show,
  isAdmin,
}: {
  show: DiscoveryShow;
  isAdmin: boolean;
}) {
  return (
    <Card className="overflow-hidden py-0 ring-foreground/8 transition-colors hover:ring-foreground/15">
      <div className="relative">
        <Link
          href={`/s/${show.slug}`}
          className="flex w-full flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={show.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <Badge
              variant="destructive"
              size="micro"
              className="absolute left-3 top-3 bg-live text-live-foreground"
            >
              Live
            </Badge>
          </div>

          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal">{show.title}</CardTitle>
            <CardDescription>{show.host}</CardDescription>
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
            <span className="micro text-muted-foreground">Join show</span>
          </CardFooter>
        </Link>
        {isAdmin ? (
          <div className="absolute right-3 top-3">
            <EndLiveShowButton
              slug={show.slug}
              title={show.title}
              size="micro"
              variant="admin"
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
