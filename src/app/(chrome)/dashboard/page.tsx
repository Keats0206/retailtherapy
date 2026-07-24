import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ChevronRight, Clapperboard, Radio } from "lucide-react";

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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-5 py-14 sm:gap-12 sm:px-6 sm:py-24">
      <div className="flex flex-col gap-5">
        <span className="micro inline-flex items-center gap-2 text-muted-foreground">
          <span className="size-1.5 rounded-full bg-live" />
          Live shopping
        </span>
        <h1 className="max-w-xl text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl">
          Go live, drop links as you show things, and let the room decide
          what&rsquo;s worth it.
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        {liveShows.length > 0 ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/host?slug=${liveShows[0].slug}`}
                className={cn(
                  ctaClasses,
                  "bg-live text-live-foreground hover:bg-live/90",
                )}
              >
                <Radio className="size-4" />
                Back to your studio
              </Link>
              <EndLiveShowButton
                slug={liveShows[0].slug}
                title={liveShows[0].title}
                size="lg"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              You&rsquo;re still live. Hop back in, or wrap it up.
            </p>
          </>
        ) : (
          <>
            <Link
              href="/host"
              className={cn(
                ctaClasses,
                "bg-live text-live-foreground hover:bg-live/90",
              )}
            >
              <Radio className="size-4" />
              Go live as host
            </Link>
            <p className="text-sm text-muted-foreground">
              Here to watch? Open the link your host sent, or{" "}
              <Link
                href="/browse"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                browse live shows
              </Link>
              .
            </p>
          </>
        )}
      </div>

      {liveShows.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="micro text-muted-foreground">Your live shows</h2>
          <div className="flex flex-col gap-2.5">
            {liveShows.map((show) => (
              <ShowRow key={show.id} show={show} />
            ))}
          </div>
        </section>
      ) : null}

      {pastShows.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="micro text-muted-foreground">Past shows</h2>
          <div className="flex flex-col gap-2.5">
            {pastShows.map((show) => (
              <ShowRow key={show.id} show={show} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

const ctaClasses = cn(
  buttonVariants({ size: "lg" }),
  "h-12 w-full gap-2 rounded-full px-6 text-base font-medium sm:w-fit",
);

function ShowRow({
  show,
}: {
  show: Awaited<ReturnType<typeof listShowsForHost>>[number];
}) {
  const isLive = show.status === "live";
  const statusLabel = isLive
    ? "Live"
    : show.status === "ended"
      ? "Ended"
      : "Scheduled";
  const actionLabel = isLive ? "Open studio" : "View recap";
  const href = isLive ? `/host?slug=${show.slug}` : `/host/${show.slug}`;
  const dateLabel = show.startedAt
    ? show.startedAt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card className="py-0 ring-foreground/8 transition-all hover:-translate-y-px hover:ring-foreground/20">
      <div className="flex items-center gap-1 pr-2 sm:pr-3">
        <Link
          href={href}
          className="group flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-4 sm:px-4 sm:py-3.5"
        >
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              isLive
                ? "bg-live/15 text-live-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isLive ? (
              <Radio className="size-5" />
            ) : (
              <Clapperboard className="size-5" />
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-normal">
                {show.title}
              </span>
              {isLive ? (
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
            <span className="hidden sm:inline">{actionLabel}</span>
            <ChevronRight className="size-4 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" />
          </span>
        </Link>
        <DeleteShowButton
          slug={show.slug}
          title={show.title}
          disabled={isLive}
        />
        {isLive ? (
          <EndLiveShowButton slug={show.slug} title={show.title} size="sm" />
        ) : null}
      </div>
    </Card>
  );
}
