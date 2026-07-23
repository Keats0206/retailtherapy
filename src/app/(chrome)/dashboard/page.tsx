import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ChevronRight } from "lucide-react";

import { DeleteShowButton } from "@/components/delete-show-button";
import { EndLiveShowButton } from "@/components/end-live-show-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listShowsForHost } from "@/lib/shows";
import { cn } from "@/lib/utils";

export default async function Dashboard() {
  const { userId } = await auth();
  const shows = userId ? await listShowsForHost(userId) : [];
  const liveShows = shows.filter((show) => show.status === "live");
  const pastShows = shows.filter((show) => show.status !== "live");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-24">
      <div className="flex flex-col gap-6">
        <span className="micro text-muted-foreground">Live shopping</span>
        <h1 className="max-w-xl text-2xl font-normal leading-snug tracking-tight">
          Hosts go live from the browser, add links as they show them, and the
          room decides whether it&rsquo;s worth buying.
        </h1>
      </div>

      <div className="flex flex-col gap-6 border-t border-border pt-8">
        {liveShows.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              You still have a show live. Reconnect in the studio or end it
              below.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/host?slug=${liveShows[0].slug}`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-fit bg-live text-live-foreground hover:bg-live/90",
                )}
              >
                Open studio
              </Link>
              <EndLiveShowButton
                slug={liveShows[0].slug}
                title={liveShows[0].title}
                size="lg"
              />
            </div>
          </>
        ) : (
          <Link
            href="/host"
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-fit bg-live text-live-foreground hover:bg-live/90",
            )}
          >
            Go live as host
          </Link>
        )}
        <p className="text-sm text-muted-foreground">
          Watching? Open the link your host sent you, or browse{" "}
          <Link href="/browse" className="text-foreground underline-offset-4 hover:underline">
            live shows
          </Link>
          .
        </p>
      </div>

      {liveShows.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="micro text-muted-foreground">Your live shows</h2>
          <div className="flex flex-col gap-3">
            {liveShows.map((show) => (
              <ShowRow key={show.id} show={show} />
            ))}
          </div>
        </section>
      ) : null}

      {pastShows.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="micro text-muted-foreground">Past shows</h2>
          <div className="flex flex-col gap-3">
            {pastShows.map((show) => (
              <ShowRow key={show.id} show={show} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ShowRow({
  show,
}: {
  show: Awaited<ReturnType<typeof listShowsForHost>>[number];
}) {
  const statusLabel =
    show.status === "live"
      ? "Live"
      : show.status === "ended"
        ? "Ended"
        : "Scheduled";
  const actionLabel =
    show.status === "live" ? "Open studio" : "View recap";
  const href =
    show.status === "live"
      ? `/host?slug=${show.slug}`
      : `/host/${show.slug}`;
  const dateLabel = show.startedAt
    ? show.startedAt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card className="py-0 ring-foreground/8 transition-colors hover:ring-foreground/15">
      <div className="flex items-center gap-1 pr-2 sm:pr-3">
        <Link
          href={href}
          className="group flex min-w-0 flex-1 items-center gap-4 px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-normal">{show.title}</span>
              {show.status === "live" ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-live">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                  <span className="micro">{statusLabel}</span>
                </span>
              ) : (
                <Badge variant="secondary" size="micro" className="shrink-0">
                  {statusLabel}
                </Badge>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              /s/{show.slug}
              {dateLabel ? ` · ${dateLabel}` : null}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
            {actionLabel}
            <ChevronRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </Link>
        <DeleteShowButton
          slug={show.slug}
          title={show.title}
          disabled={show.status === "live"}
        />
        {show.status === "live" ? (
          <EndLiveShowButton slug={show.slug} title={show.title} size="sm" />
        ) : null}
      </div>
    </Card>
  );
}
