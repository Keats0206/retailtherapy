"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import { ChatPanelView, type ChatLine } from "@/components/chat-panel";
import { PollComposer } from "@/components/poll-composer";
import { PollLaunchButton, PollOverlay } from "@/components/poll-overlay";
import { StudioLayout } from "@/components/studio-layout";
import {
  CAMERA_BUBBLE,
  MONITOR_ASIDE,
  MONITOR_CAMERA,
  MONITOR_SHARE,
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { ViewerCountView } from "@/components/viewer-count";
import { WatchLayout } from "@/components/watch-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MOCK_CHAT,
  MOCK_SNAPSHOT,
  MOCK_VIEWER_COUNT,
  resolveMockProduct,
} from "@/lib/mock-data";
import { useMockPollState } from "@/lib/mock-poll-state";
import { useMockStreamState } from "@/lib/mock-stream-state";
import type { PollState } from "@/lib/poll-store";

export type View = "creator" | "consumer";

export default function PrototypeClient({
  initialView,
}: {
  initialView: View;
}) {
  const [view, setView] = useState<View>(initialView);

  // One stream state above the toggle, so it survives switching panes. That's
  // the whole point: pin something as the creator, flip, and see it land.
  const stream = useMockStreamState(MOCK_SNAPSHOT);
  // Same for the poll: launch as the creator, flip, and vote on it.
  const poll = useMockPollState();
  const [messages, setMessages] = useState<ChatLine[]>(MOCK_CHAT);

  const send = useCallback(
    (message: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${prev.length}`,
          timestamp: Date.now(),
          message,
          from: { name: view === "creator" ? "You (host)" : "You" },
        },
      ]);
    },
    [view],
  );

  function show(next: View) {
    setView(next);
    // Survives a reload without a navigation or a re-render of the tree.
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
        <div className="flex items-center gap-5">
          <Badge variant="secondary" size="micro">
            Prototype
          </Badge>
          <nav className="flex items-center gap-1">
            <Button
              size="micro"
              variant="ghost"
              render={<Link href="/prototype/onboarding" />}
            >
              Onboarding
            </Button>
            <Toggle active={view === "creator"} onClick={() => show("creator")}>
              Creator
            </Toggle>
            <Toggle
              active={view === "consumer"}
              onClick={() => show("consumer")}
            >
              Consumer
            </Toggle>
          </nav>
        </div>
        <span className="micro text-muted-foreground">
          Mock data · not connected
        </span>
      </div>

      {view === "creator" ? (
        <Creator stream={stream} poll={poll} messages={messages} onSend={send} />
      ) : (
        <Consumer stream={stream} poll={poll} messages={messages} onSend={send} />
      )}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="micro"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Button>
  );
}

type PaneProps = {
  stream: ReturnType<typeof useMockStreamState>;
  poll: PollState;
  messages: ChatLine[];
  onSend: (message: string) => void;
};

/** /host while live, minus the room. */
function Creator({ stream, poll, messages, onSend }: PaneProps) {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
        <span className="micro inline-flex items-center gap-2 text-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
          You&rsquo;re live
        </span>
        <ViewerCountView count={MOCK_VIEWER_COUNT} />
      </div>

      <StudioLayout
        stream={stream}
        onResolveProduct={resolveMockProduct}
        monitor={
          <aside className={MONITOR_ASIDE}>
            {/* `relative` so the vote pill and overlay ride the monitor the
                way they ride the viewer's video. */}
            <div className="relative flex flex-col gap-3">
              <VideoFrame label="You" className={MONITOR_CAMERA}>
                <VideoPlaceholder>Camera</VideoPlaceholder>
              </VideoFrame>
              <VideoFrame label="On screen" className={MONITOR_SHARE}>
                <VideoPlaceholder>Screen share</VideoPlaceholder>
              </VideoFrame>

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end p-2">
                <PollLaunchButton onClick={() => setComposerOpen(true)} />
              </div>
              {poll.poll && (
                <PollOverlay
                  poll={poll.poll}
                  myVote={poll.myVote}
                  role="creator"
                  size="compact"
                  onDismiss={poll.dismiss}
                  onNewVote={() => setComposerOpen(true)}
                />
              )}
            </div>
            <p className="micro text-muted-foreground">
              Video is stubbed here — go to /host for the real controls.
            </p>
          </aside>
        }
        chat={
          <ChatPanelView
            messages={messages}
            onSend={onSend}
            className="min-h-64 flex-1 xl:w-80 xl:flex-none"
          />
        }
      />

      <PollComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onLaunch={poll.start}
      />
    </div>
  );
}

/** /watch/[playbackId], minus the room. */
function Consumer({ stream, poll, messages, onSend }: PaneProps) {
  return (
    // Mirrors the real /watch shell: no max-width, no padding, no heading.
    <main className="flex min-h-0 flex-1 flex-col">
      <WatchLayout
        stream={stream}
        viewers={<ViewerCountView count={MOCK_VIEWER_COUNT} />}
        stage={
          <div className="relative h-full w-full">
            <VideoPlaceholder>Screen share</VideoPlaceholder>
            <VideoFrame className={CAMERA_BUBBLE}>
              <VideoPlaceholder>Camera</VideoPlaceholder>
            </VideoFrame>
          </div>
        }
        overlay={
          poll.poll && (
            <PollOverlay
              poll={poll.poll}
              myVote={poll.myVote}
              role="viewer"
              onVote={poll.vote}
            />
          )
        }
        chat={<ChatPanelView messages={messages} onSend={onSend} />}
      />
    </main>
  );
}
