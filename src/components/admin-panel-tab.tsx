"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { AdminCloseAllButton } from "@/components/admin-close-all-button";
import { DeleteShowButton } from "@/components/delete-show-button";
import { EndLiveShowButton } from "@/components/end-live-show-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { readResponseJson } from "@/lib/fetch-json";
import type { Show } from "@/lib/shows";
import { viewerShowPath } from "@/lib/show-urls";

type PanelShow = Omit<Show, "startedAt" | "endedAt" | "createdAt" | "updatedAt"> & {
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatShowDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRanFor(
  startedAt: string | null,
  endedAt: string | null,
): string | null {
  if (!startedAt || !endedAt) return null;
  const minutes = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000,
  );
  if (minutes < 1) return "Ran under a minute";
  if (minutes < 60) return `Ran ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `Ran ${hours}h ${remainder}m` : `Ran ${hours}h`;
}

function formatDuration(startedAt: string): string {
  const minutes = Math.floor(
    (Date.now() - new Date(startedAt).getTime()) / 60_000,
  );
  if (minutes < 1) return "Just started";
  if (minutes < 60) return `${minutes}m live`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m live` : `${hours}h live`;
}

export function AdminPanelTab({
  initialLiveShows,
  initialPastShows,
  onLiveCountChange,
  onRegisterRefresh,
}: {
  initialLiveShows: PanelShow[];
  initialPastShows: PanelShow[];
  onLiveCountChange?: (count: number) => void;
  onRegisterRefresh?: (refresh: () => void) => void;
}) {
  const [liveShows, setLiveShows] = useState(initialLiveShows);
  const [pastShows, setPastShows] = useState(initialPastShows);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/panel");
      const data = await readResponseJson<{
        liveShows: PanelShow[];
        pastShows: PanelShow[];
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to refresh panel");
      }
      setLiveShows(data.liveShows);
      setPastShows(data.pastShows);
      onLiveCountChange?.(data.liveShows.length);
    } catch (err) {
      console.error("[admin/panel] refresh failed", err);
    } finally {
      setRefreshing(false);
    }
  }, [onLiveCountChange]);

  useEffect(() => {
    onRegisterRefresh?.(refresh);
  }, [onRegisterRefresh, refresh]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {refreshing ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Refreshing…
          </span>
        ) : null}
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
                    onEnded={() => void refresh()}
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
                          <Badge
                            variant="outline"
                            size="micro"
                            className="shrink-0"
                          >
                            Recap
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {viewerShowPath(show.slug)}
                        {show.hostName ? ` · ${show.hostName}` : null}
                        {show.endedAt
                          ? ` · ${formatShowDate(show.endedAt)}`
                          : null}
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
                      onDeleted={() => void refresh()}
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
    </>
  );
}

export function AdminPanelActions({
  liveCount,
  onCloseAll,
}: {
  liveCount: number;
  onCloseAll?: () => void;
}) {
  return (
    <AdminCloseAllButton liveCount={liveCount} onClosed={onCloseAll} />
  );
}

export type { PanelShow };
