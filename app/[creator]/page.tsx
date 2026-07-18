"use client";

import Link from "next/link";
import { useAppState } from "@/lib/store";
import { useGuest } from "@/lib/use-guest";
import { CreatorHeader } from "@/components/creator-header";
import { VideoStage } from "@/components/video-stage";
import { ChatPanel } from "@/components/chat-panel";
import { CurrentProduct } from "@/components/current-product";
import { ShoppingTrail } from "@/components/shopping-trail";
import { Button } from "@/components/ui/button";

export default function ViewerPage() {
  const { creator, session, products, currentProductId, chat } = useAppState();
  const guest = useGuest();
  const currentProduct = products.find((p) => p.id === currentProductId) ?? null;
  const ended = session.status === "ended";

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <CreatorHeader creator={creator} session={session} className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/${creator.handle}/studio`} />}
        >
          Studio ↗
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <VideoStage
            creator={creator}
            session={session}
            currentProduct={currentProduct}
            messages={chat}
            chatUser={guest}
          />
          <CurrentProduct product={currentProduct} />
        </div>

        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card lg:h-[calc(100%-0px)]">
          <ChatPanel messages={chat} user={guest} disabled={!session.startedAt} />
        </div>
      </div>

      <ShoppingTrail products={products} currentProductId={currentProductId} />

      {ended && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <div className="font-medium">This stream has ended</div>
            <div className="text-sm text-muted-foreground">
              Revisit every product and Peter&apos;s verdicts in the replay.
            </div>
          </div>
          <Button render={<Link href={`/${creator.handle}/replay`} />}>
            View replay
          </Button>
        </div>
      )}
    </main>
  );
}
