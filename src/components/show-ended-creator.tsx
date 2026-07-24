"use client";

import Link from "next/link";
import { ExternalLink, RotateCcw } from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";

import { ShoppingTrail } from "@/components/shopping-trail";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VideoFrame, VideoPlaceholder } from "@/components/video-placeholder";
import { formatCount, formatDuration } from "@/lib/format";
import type { EndedShowRecap } from "@/lib/show-recap";
import { cn } from "@/lib/utils";

function tallyVotes(recap: EndedShowRecap) {
  let buy = 0;
  let skip = 0;
  for (const v of Object.values(recap.snapshot.votes)) {
    buy += v.buy;
    skip += v.skip;
  }
  return { buy, skip, total: buy + skip };
}

export function ShowEndedCreator({
  recap,
  onStartNew,
}: {
  recap: EndedShowRecap;
  onStartNew?: () => void;
}) {
  const votes = tallyVotes(recap);
  const viewerPath = `/s/${recap.slug}`;

  const stats = [
    { label: "Peak viewers", value: formatCount(recap.peakViewers) },
    { label: "Duration", value: formatDuration(recap.durationMs) },
    { label: "Links added", value: String(recap.snapshot.trail.length) },
    { label: "Audience votes", value: formatCount(votes.total) },
    { label: "Chat messages", value: formatCount(recap.chatCount) },
    {
      label: "Buy intent",
      value: votes.total ? `${Math.round((votes.buy / votes.total) * 100)}%` : "—",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8">
      <header className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Show ended
        </Badge>
        <h1 className="text-2xl font-normal tracking-tight">{recap.title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Nice work — your recap is live for viewers. Share the link so they can
          rewatch and shop everything you added.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Viewer recap</CardTitle>
            <CardDescription>
              This is what your audience sees — recording plus the full trail.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <VideoFrame label="Recording" className="aspect-video w-full">
              {recap.muxPlaybackId ? (
                <MuxPlayer
                  playbackId={recap.muxPlaybackId}
                  className="h-full w-full"
                  streamType="on-demand"
                />
              ) : (
                <VideoPlaceholder>
                  Recording processing — ready in a few minutes
                </VideoPlaceholder>
              )}
            </VideoFrame>
            <div className="flex flex-wrap gap-2">
              <Link
                href={viewerPath}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-1.5",
                )}
              >
                Open viewer recap
                <ExternalLink className="size-3.5" />
              </Link>
              <code className="micro flex-1 truncate self-center font-mono text-muted-foreground">
                {viewerPath}
              </code>
            </div>
          </CardContent>
        </Card>

        <ShoppingTrail
          products={recap.snapshot.trail}
          pinnedId={null}
          votesFor={(id) => recap.snapshot.votes[id] ?? { buy: 0, skip: 0 }}
          size="comfortable"
          className="h-fit"
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          The recording may take a few minutes to appear on the recap page.
        </p>
        {onStartNew ? (
          <Button size="micro" variant="outline" onClick={onStartNew}>
            <RotateCcw />
            Prep another show
          </Button>
        ) : (
          <Link href="/host">
            <Button size="micro" variant="outline">
              <RotateCcw />
              Prep another show
            </Button>
          </Link>
        )}
      </div>
    </main>
  );
}
