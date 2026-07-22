"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ChatPanelView, type ChatLine } from "@/components/chat-panel";
import { ShowEndedViewer } from "@/components/show-ended-viewer";
import {
  CAMERA_BUBBLE,
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { ViewerCountView } from "@/components/viewer-count";
import { WatchLayout } from "@/components/watch-layout";
import { Button } from "@/components/ui/button";
import { MOCK_CHAT, MOCK_SNAPSHOT } from "@/lib/mock-data";
import {
  subscribeShowEnded,
  type EndedShowRecap,
} from "@/lib/mock-show-status";
import { useMockStreamState } from "@/lib/mock-stream-state";

import type { LiveShow } from "@/lib/mock-home-data";

export default function ShowView({ show }: { show: LiveShow }) {
  const stream = useMockStreamState(MOCK_SNAPSHOT);
  const [messages, setMessages] = useState<ChatLine[]>(MOCK_CHAT);
  const [endedRecap, setEndedRecap] = useState<EndedShowRecap | null>(null);

  useEffect(() => {
    return subscribeShowEnded(show.slug, setEndedRecap);
  }, [show.slug]);

  const send = useCallback((message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${prev.length}`,
        timestamp: Date.now(),
        message,
        from: { name: "You" },
      },
    ]);
  }, []);

  if (endedRecap) {
    return <ShowEndedViewer recap={endedRecap} />;
  }

  if (!show.isLive) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <img
          src={show.thumbnailUrl}
          alt=""
          className="aspect-video w-full rounded-xl object-cover ring-1 ring-foreground/10"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-normal tracking-tight">{show.title}</h1>
          <p className="text-sm text-muted-foreground">
            {show.host} · {show.category}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          This show hasn&rsquo;t started yet.
        </p>
        <Link href="/ui-proto">
          <Button variant="outline" size="micro">
            Back to home
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <WatchLayout
        stream={stream}
        exitHref="/ui-proto"
        viewers={<ViewerCountView count={show.viewers} />}
        stage={
          <div className="relative h-full w-full">
            <VideoPlaceholder>{show.title}</VideoPlaceholder>
            <VideoFrame className={CAMERA_BUBBLE}>
              <VideoPlaceholder>{show.host}</VideoPlaceholder>
            </VideoFrame>
          </div>
        }
        chat={<ChatPanelView messages={messages} onSend={send} />}
      />
    </main>
  );
}
