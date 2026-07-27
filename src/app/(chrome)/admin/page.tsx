import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminCloseAllButton } from "@/components/admin-close-all-button";
import { EndLiveShowButton } from "@/components/end-live-show-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminUser, isSuperAdmin } from "@/lib/auth";
import { listLiveShowsForAdmin } from "@/lib/shows";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Admin — frontrow",
};

function formatDuration(startedAt: Date): string {
  const minutes = Math.floor((Date.now() - startedAt.getTime()) / 60_000);
  if (minutes < 1) return "Just started";
  if (minutes < 60) return `${minutes}m live`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m live` : `${hours}h live`;
}

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();

  const liveShows = await listLiveShowsForAdmin();
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
            remove it from browse and send viewers to the recap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/browse" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Browse live shows
          </Link>
          <Link
            href="/admin/creator-outreach"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Creator outreach
          </Link>
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
                    {show.startedAt ? (
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(show.startedAt)}
                      </p>
                    ) : null}
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
