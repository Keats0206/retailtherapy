"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAppState } from "@/lib/store";
import { useGuest } from "@/lib/use-guest";
import { startScreenShare, stopStream } from "@/lib/services/video";
import { LiveDot } from "@/components/creator-header";
import { VideoStage } from "@/components/video-stage";
import { ChatPanel } from "@/components/chat-panel";
import { StudioControls } from "@/components/studio-controls";
import { Button } from "@/components/ui/button";

export default function StudioPage() {
  const { creator, session, products, currentProductId, chat } = useAppState();
  useGuest(); // triggers cross-tab sync request on mount
  const currentProduct = products.find((p) => p.id === currentProductId) ?? null;

  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const sharing = !!screenStream;

  const toggleShare = useCallback(async () => {
    if (screenStream) {
      stopStream(screenStream);
      setScreenStream(null);
      return;
    }
    const stream = await startScreenShare();
    if (!stream) {
      toast.error("Screen share was cancelled or isn't available");
      return;
    }
    // Reflect it when the user stops sharing via the browser's own control.
    stream.getVideoTracks()[0]?.addEventListener("ended", () => setScreenStream(null));
    setScreenStream(stream);
    toast.success("Sharing your screen");
  }, [screenStream]);

  // Stop sharing when the stream ends or the stream is ended off-page.
  useEffect(() => {
    return () => {
      if (screenStream) stopStream(screenStream);
    };
  }, [screenStream]);

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Creator Studio</h1>
          <LiveDot live={session.status === "live"} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/${creator.handle}`} />}
          >
            View as viewer ↗
          </Button>
          {session.status === "ended" && (
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={`/${creator.handle}/replay`} />}
            >
              Replay ↗
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <VideoStage
            creator={creator}
            session={session}
            currentProduct={currentProduct}
            enableCameraPreview
            screenStream={screenStream}
            messages={chat}
            chatUser={creator.name}
          />
          <div className="rounded-xl border border-border bg-card p-4">
            <StudioControls
              session={session}
              products={products}
              currentProduct={currentProduct}
              sharing={sharing}
              onToggleShare={toggleShare}
            />
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card">
          <ChatPanel messages={chat} user={creator.name} disabled={!session.startedAt} />
        </div>
      </div>
    </main>
  );
}
