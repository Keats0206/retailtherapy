import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin-access-denied";
import { AdminCloseAllButton } from "@/components/admin-close-all-button";
import { AdminNav } from "@/components/admin-nav";
import { DeleteShowButton } from "@/components/delete-show-button";
import { EndLiveShowButton } from "@/components/end-live-show-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminAccess, isSuperAdmin } from "@/lib/auth";
import { countPendingWaitlistSignups } from "@/lib/host-approvals";
import { listLiveShowsForAdmin, listPastShowsForAdmin } from "@/lib/shows";
import { viewerShowPath } from "@/lib/show-urls";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Admin — frontrow",
};

function formatShowDate(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRanFor(startedAt: Date | null, endedAt: Date | null): string | null {
  if (!startedAt || !endedAt) return null;
  const minutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000);
  if (minutes < 1) return "Ran under a minute";
  if (minutes < 60) return `Ran ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `Ran ${hours}h ${remainder}m` : `Ran ${hours}h`;
}

function formatDuration(startedAt: Date): string {
  const minutes = Math.floor((Date.now() - startedAt.getTime()) / 60_000);
  if (minutes < 1) return "Just started";
  if (minutes < 60) return `${minutes}m live`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m live` : `${hours}h live`;
}

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (access.status === "unauthenticated") notFound();
  if (access.status === "denied") {
    return (
      <AdminAccessDenied
        username={access.username}
        emails={access.emails}
      />
    );
  }

  const admin = access.user;

  const [liveShows, pastShows, pendingWaitlist] = await Promise.all([
    listLiveShowsForAdmin(),
    listPastShowsForAdmin(),
    countPendingWaitlistSignups(),
  ]);
  const adminLabel =
    admin.username ??
    admin.firstName ??
    admin.emailAddresses[0]?.emailAddress ??
    "Admin";
  const superAdmin = isSuperAdmin(admin);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-24">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="micro text-muted-foreground">Admin</span>
          <h1 className="text-2xl font-normal leading-snug tracking-tight">
            Live show control panel
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Signed in as {adminLabel}
            {superAdmin ? " · super admin" : null}. Force-end any live show to
            remove it from browse and send viewers to the recap, or delete a
            past show to remove its recap for good.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/browse" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Browse live shows
          </Link>
          <AdminNav active="panel" pendingWaitlist={pendingWaitlist} />
          <AdminCloseAllButton liveCount={liveShows.length} />
        </div>
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
                      <Badge variant="live" size="micro" className="shrink-0">
                        Live
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {viewerShowPath(show.slug)}
                      {show.hostName ? ` · ${show.hostName}` : null}
                      {show.startedAt
                        ? ` · ${formatShowDate(show.startedAt)}`
                        : null}
                    </p>
                    {show.startedAt ? (
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(show.startedAt)}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={viewerShowPath(show.slug)}
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

      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="micro text-muted-foreground">Past shows</h2>
          {pastShows.length > 0 ? (
            <span className="micro text-muted-foreground">
              {pastShows.length} ended
            </span>
          ) : null}
        </div>

        {pastShows.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pastShows.map((show) => {
              const ranFor = formatRanFor(show.startedAt, show.endedAt);
              return (
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
                        {show.muxPlaybackId ? (
                          <Badge variant="outline" size="micro" className="shrink-0">
                            Recap
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {viewerShowPath(show.slug)}
                        {show.hostName ? ` · ${show.hostName}` : null}
                        {show.endedAt ? ` · ${formatShowDate(show.endedAt)}` : null}
                      </p>
                      {ranFor ? (
                        <p className="text-xs text-muted-foreground">{ranFor}</p>
                      ) : null}
                    </div>
                    <Link
                      href={viewerShowPath(show.slug)}
                      className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      View
                    </Link>
                    <DeleteShowButton
                      slug={show.slug}
                      title={show.title}
                      variant="admin"
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No past shows yet.</p>
        )}
      </section>
    </main>
  );
}
