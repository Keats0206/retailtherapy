"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Radio } from "lucide-react";
import { useState } from "react";

import { ShareShowLinkButton } from "@/components/share-show-link-button";
import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import {
  startScheduledShow,
  writePendingLiveSession,
} from "@/lib/host-go-live";
import { hostScheduledPath, hostShowPath } from "@/lib/show-urls";

export default function HostScheduledClient({
  slug,
  title,
  scheduledFor,
}: {
  slug: string;
  title: string;
  scheduledFor: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduledLabel = new Date(scheduledFor).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleGoLive() {
    setLoading(true);
    setError(null);
    try {
      const session = await startScheduledShow(slug);
      trackEvent(AnalyticsEvent.HOST_GO_LIVE, { area: "scheduled_studio" });
      writePendingLiveSession(session);
      router.push(hostShowPath(session.slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <span className="micro text-muted-foreground">Scheduled show</span>
        <h1 className="text-2xl font-normal tracking-tight">{title}</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4 shrink-0" />
          {scheduledLabel}
        </p>
      </div>

      <div className="soft-panel flex flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Share the waitroom link so viewers can register interest and join
          automatically when you go live.
        </p>
        <ShareShowLinkButton
          slug={slug}
          sharePath="waitroom"
          showPath
          className="w-full"
        />
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          render={<Link href={hostScheduledPath(slug)} />}
        >
          Open share page
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          disabled={loading}
          onClick={() => void handleGoLive()}
          className="gap-2 bg-live text-live-foreground hover:bg-live/90"
        >
          <Radio className="size-4" />
          {loading ? "Starting…" : "Go live now"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Ready early? You can go live before the scheduled time — viewers in
          the waitroom will be brought in automatically.
        </p>
      </div>
    </main>
  );
}
