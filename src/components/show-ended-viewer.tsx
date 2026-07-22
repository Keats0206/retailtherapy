"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import type { EndedShowRecap } from "@/lib/show-recap";
import { cn } from "@/lib/utils";

export function ShowEndedViewer({
  recap,
  polling = false,
  onRecordingReady,
}: {
  recap: EndedShowRecap;
  /** Poll the show API until muxPlaybackId is available. */
  polling?: boolean;
  onRecordingReady?: () => void | Promise<void>;
}) {
  const sharePath = `/s/${recap.slug}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!polling || recap.muxPlaybackId || !onRecordingReady) return;
    const id = setInterval(() => void onRecordingReady(), 10_000);
    return () => clearInterval(id);
  }, [onRecordingReady, polling, recap.muxPlaybackId]);

  async function copyLink() {
    const url = `${window.location.origin}${sharePath}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Show ended
        </Badge>
        <h1 className="text-2xl font-normal tracking-tight">{recap.title}</h1>
        <p className="text-sm text-muted-foreground">
          {recap.host} · Rewatch the show and shop everything that was pinned.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Rewatch</CardTitle>
            <CardDescription>
              Full recording — scrub back to any moment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoFrame label="Recording" className="aspect-video w-full">
              {recap.muxPlaybackId ? (
                <MuxPlayer
                  playbackId={recap.muxPlaybackId}
                  className="h-full w-full"
                  streamType="on-demand"
                />
              ) : (
                <VideoPlaceholder>
                  Recording is processing — check back in a few minutes
                </VideoPlaceholder>
              )}
            </VideoFrame>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <ShoppingTrail
            products={recap.snapshot.trail}
            pinnedId={null}
            votesFor={(id) => recap.snapshot.votes[id] ?? { buy: 0, skip: 0 }}
            size="comfortable"
            className="min-h-0 flex-1"
          />

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Share this recap</CardTitle>
              <CardDescription>
                Send friends the link — the trail stays shoppable after the show.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void copyLink()}>
                {copied ? "Copied!" : "Copy link"}
              </Button>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Back to home
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
