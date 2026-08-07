"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Radio } from "lucide-react";

import { HostSetupPanel } from "@/components/host-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { formatBrief } from "@/lib/challenge-format";
import {
  createLiveShow,
  writePendingLiveSession,
} from "@/lib/host-go-live";
import { hostShowPath } from "@/lib/show-urls";
import { HOST_CTA } from "@/lib/host-cta-copy";
import {
  EMPTY_DRAFT,
  readShowSetupDraft,
  type ShowSetupDraft,
  writeShowSetupDraft,
} from "@/lib/show-setup";

/** The event a host arrived from, resolved server-side on the setup route. */
export type SetupChallenge = {
  slug: string;
  title: string;
  prompt: string;
  brandName: string;
  storeUrl: string | null;
  emoji: string | null;
  budget: number;
  currency: string;
  durationSeconds: number | null;
};

export default function HostSetupClient({
  challenge = null,
  liveShowSlug = null,
}: {
  challenge?: SetupChallenge | null;
  liveShowSlug?: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ShowSetupDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const stored = readShowSetupDraft();
    const seeded: ShowSetupDraft = challenge
      ? {
          ...(stored ?? EMPTY_DRAFT),
          challengeSlug: challenge.slug,
          challengeStoreUrl: challenge.storeUrl,
          challengeBrandName: challenge.brandName,
          showName: stored?.nameTouched ? stored.showName : challenge.title,
        }
      : (stored ?? EMPTY_DRAFT);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(seeded);
  }, [challenge]);

  function patch(next: Partial<ShowSetupDraft>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...next };
      writeShowSetupDraft(updated);
      return updated;
    });
  }

  async function handleGoLive() {
    if (!draft?.intent) return;
    setLoading(true);
    setError(null);
    try {
      const session = await createLiveShow(draft, draft.showName, {
        liveShowSlug,
      });
      trackEvent(AnalyticsEvent.HOST_GO_LIVE, { area: "host_setup" });
      trackEvent(AnalyticsEvent.HOST_SETUP_COMPLETE, {
        area: "host_setup",
        ...(draft.challengeSlug ? { challenge: draft.challengeSlug } : {}),
      });
      writePendingLiveSession(session);
      router.push(hostShowPath(session.slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!draft) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-normal tracking-tight">Set up your show</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tell viewers what you&rsquo;re shopping for, then go live. You&rsquo;ll
          open a store and share your screen once you&rsquo;re on air.
        </p>
      </div>

      {challenge ? (
        <div className="flex items-start gap-3 rounded-none bg-muted/50 p-4 ring-1 ring-foreground/8">
          <span className="text-xl" aria-hidden>
            {challenge.emoji ?? "🛍️"}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="micro text-muted-foreground">
              {formatBrief(challenge)}
            </span>
            <p className="text-sm leading-relaxed text-foreground">
              {challenge.prompt}
            </p>
          </div>
        </div>
      ) : null}

      <section className="flex flex-col gap-2">
        <span className="micro text-muted-foreground">Show title</span>
        <Input
          value={draft.showName}
          onChange={(e) =>
            patch({ showName: e.target.value, nameTouched: true })
          }
          placeholder="Name your show"
          aria-label="Show title"
          className="rounded-none"
        />
      </section>

      <HostSetupPanel draft={draft} onPatch={patch} />

      <div className="mt-auto flex flex-col gap-4 pt-2">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" render={<Link href={HOST_CTA.schedule.href} />}>
            Schedule for later
          </Button>
          <Button
            disabled={!draft.intent || loading}
            onClick={() => void handleGoLive()}
            className="gap-2 bg-live text-live-foreground hover:bg-live/90"
          >
            <Radio className="size-4" />
            {loading ? "Starting…" : "Go live"}
          </Button>
        </div>
      </div>
    </main>
  );
}
