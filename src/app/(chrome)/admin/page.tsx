import Link from "next/link";
import { notFound } from "next/navigation";

import { EndLiveShowButton } from "@/components/end-live-show-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAdminUser } from "@/lib/auth";
import { listLiveShowsForAdmin } from "@/lib/shows";

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();

  const liveShows = await listLiveShowsForAdmin();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-24">
      <div className="flex flex-col gap-3">
        <span className="micro text-muted-foreground">Admin</span>
        <h1 className="text-2xl font-normal leading-snug tracking-tight">
          Live show moderation
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Force-end a show to remove it from browse and move viewers to the
          recap. This uses the host&apos;s last saved snapshot.
        </p>
      </div>

      <section className="flex flex-col gap-4 border-t border-border pt-8">
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
          <div className="flex flex-col gap-3">
            {liveShows.map((show) => (
              <Card
                key={show.id}
                className="py-0 ring-foreground/8 transition-colors hover:ring-foreground/15"
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-normal">
                        {show.title}
                      </span>
                      <Badge
                        variant="destructive"
                        size="micro"
                        className="shrink-0 bg-live text-live-foreground"
                      >
                        Live
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      /s/{show.slug}
                      {show.hostName ? ` · ${show.hostName}` : null}
                      {show.startedAt
                        ? ` · ${show.startedAt.toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : null}
                    </p>
                  </div>
                  <Link
                    href={`/s/${show.slug}`}
                    className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    View
                  </Link>
                  <EndLiveShowButton
                    slug={show.slug}
                    title={show.title}
                    size="sm"
                    variant="admin"
                  />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No live shows right now.
          </p>
        )}
      </section>
    </main>
  );
}
