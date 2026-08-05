"use client";

import Link from "next/link";
import { useState } from "react";

import { DeleteShowButton } from "@/components/delete-show-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { viewerShowPath } from "@/lib/show-urls";

export type AdminPastShow = {
  id: string;
  slug: string;
  title: string;
  hostName: string | null;
  endedAt: string | null;
  startedAt: string | null;
  hasRecap: boolean;
};

function formatShowDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
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

export function AdminPastShows({ shows: initialShows }: { shows: AdminPastShow[] }) {
  const [shows, setShows] = useState(initialShows);

  if (shows.length === 0) {
    return <p className="text-sm text-muted-foreground">No past shows yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {shows.map((show) => {
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
                  {show.hasRecap ? (
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
                onDeleted={() => {
                  setShows((current) =>
                    current.filter((entry) => entry.slug !== show.slug),
                  );
                }}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
