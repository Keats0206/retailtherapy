"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { HostSetupPanel } from "@/components/host-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { formatBrief } from "@/lib/challenge-format";
import { scheduleShow } from "@/lib/host-go-live";
import { hostScheduledPath } from "@/lib/show-urls";
import {
  EMPTY_DRAFT,
  readShowSetupDraft,
  type ShowSetupDraft,
  writeShowSetupDraft,
} from "@/lib/show-setup";

import type { SetupChallenge } from "../setup/setup-client";

function defaultScheduleDatetime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(0, 0, 0);
  d.setHours(19, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function HostScheduleClient({
  challenge = null,
}: {
  challenge?: SetupChallenge | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ShowSetupDraft | null>(null);
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleDatetime);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduledDate = useMemo(
    () => new Date(scheduledAt),
    [scheduledAt],
  );
  const scheduleValid =
    !Number.isNaN(scheduledDate.getTime()) &&
    scheduledDate.getTime() > Date.now();

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

  async function handleSchedule() {
    if (!draft?.intent || !scheduleValid) return;
    setLoading(true);
    setError(null);
    try {
      const result = await scheduleShow(draft, draft.showName, scheduledDate);
      trackEvent(AnalyticsEvent.HOST_SCHEDULE_SHOW, { area: "host_schedule" });
      trackEvent(AnalyticsEvent.HOST_SETUP_COMPLETE, {
        area: "host_schedule",
        ...(draft.challengeSlug ? { challenge: draft.challengeSlug } : {}),
      });
      router.push(hostScheduledPath(result.slug));
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
        <h1 className="text-2xl font-normal tracking-tight">
          Schedule your show
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Set a date and time, tell viewers what you&rsquo;re shopping for, then
          share the waitroom link. You&rsquo;ll go live from your dashboard when
          it&rsquo;s showtime.
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

      <section className="flex flex-col gap-2">
        <span className="micro text-muted-foreground">Date &amp; time</span>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          aria-label="Scheduled date and time"
          className="rounded-none"
          min={toDatetimeLocalValue(new Date())}
        />
        {!scheduleValid && scheduledAt ? (
          <p className="text-sm text-destructive" role="alert">
            Pick a time in the future.
          </p>
        ) : null}
      </section>

      <HostSetupPanel draft={draft} onPatch={patch} />

      <div className="mt-auto flex flex-col gap-4 pt-2">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" render={<Link href="/host/setup" />}>
            Go live now instead
          </Button>
          <Button
            disabled={!draft.intent || !scheduleValid || loading}
            onClick={() => void handleSchedule()}
            className="gap-2"
          >
            <CalendarClock className="size-4" />
            {loading ? "Scheduling…" : "Schedule show"}
          </Button>
        </div>
      </div>
    </main>
  );
}
