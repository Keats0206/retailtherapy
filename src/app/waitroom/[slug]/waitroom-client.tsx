"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVisiblePoll } from "@/hooks/use-visible-poll";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { readResponseJson } from "@/lib/fetch-json";
import type { PublicShow } from "@/lib/show-public";
import { viewerShowPath } from "@/lib/show-urls";

const POLL_MS = 5_000;

export default function WaitroomClient({
  initialShow,
  initialInterest = { total: 0, registered: false },
}: {
  initialShow: PublicShow;
  initialInterest?: { total: number; registered: boolean };
}) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [show, setShow] = useState(initialShow);
  const [interest, setInterest] = useState(initialInterest);
  const [email, setEmail] = useState("");
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  // The show may already have started (or finished) by the time this renders.
  useEffect(() => {
    if (show.status !== "scheduled") router.replace(viewerShowPath(show.slug));
  }, [router, show.slug, show.status]);

  const checkStatus = useCallback(async () => {
    const res = await fetch(`/api/shows/${show.slug}`);
    if (!res.ok) return;
    let next: PublicShow;
    try {
      next = await readResponseJson<PublicShow>(res);
    } catch {
      return;
    }
    if (next.status !== "scheduled") {
      router.replace(viewerShowPath(next.slug));
    } else {
      setShow(next);
    }
  }, [router, show.slug]);

  useVisiblePoll(checkStatus, POLL_MS, show.status === "scheduled");

  async function registerInterest() {
    setInterestLoading(true);
    setInterestError(null);
    try {
      const res = await fetch(`/api/shows/${show.slug}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignedIn ? {} : { email }),
      });
      const data = await readResponseJson<{
        error?: string;
        total: number;
        registered: boolean;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Could not register interest");
      }
      setInterest({ total: data.total, registered: true });
      trackEvent(AnalyticsEvent.VIEWER_REGISTER_INTEREST, {
        area: "waitroom",
        signed_in: isSignedIn ?? false,
      });
    } catch (err) {
      setInterestError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setInterestLoading(false);
    }
  }

  const host = show.hostName?.trim() || "The host";
  const initial = host.charAt(0).toUpperCase();
  const scheduledAt = show.scheduledFor ? Date.parse(show.scheduledFor) : null;

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-hidden bg-black px-6 py-16 text-center text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 40%, rgba(255,255,255,0.08), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        <div className="flex size-16 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl font-medium">
          {initial}
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="micro text-white/40">
            {scheduledAt ? "Scheduled show" : "Starting soon"}
          </p>
          <h1 className="max-w-xl text-2xl font-normal tracking-tight sm:text-3xl">
            {show.title}
          </h1>
          <p className="text-sm text-white/50">with {host}</p>
        </div>

        <Countdown target={scheduledAt} host={host} />

        <InterestPanel
          total={interest.total}
          registered={interest.registered}
          isSignedIn={isSignedIn ?? false}
          email={email}
          onEmailChange={setEmail}
          loading={interestLoading}
          error={interestError}
          onRegister={() => void registerInterest()}
        />

        <p className="max-w-sm text-sm text-white/40">
          Keep this page open — you&apos;ll be brought into the show
          automatically the moment {host} goes live.
        </p>
      </div>

      <Link href="/home" className="relative">
        <Button variant="ghost" size="micro" className="text-white/60">
          Browse other shows
        </Button>
      </Link>
    </main>
  );
}

function InterestPanel({
  total,
  registered,
  isSignedIn,
  email,
  onEmailChange,
  loading,
  error,
  onRegister,
}: {
  total: number;
  registered: boolean;
  isSignedIn: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  onRegister: () => void;
}) {
  if (registered) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-none border border-white/15 bg-white/5 px-5 py-4">
        <span className="inline-flex items-center gap-2 text-sm text-white/80">
          <Check className="size-4" />
          You&rsquo;re on the list
        </span>
        {total > 1 ? (
          <span className="text-xs text-white/40">
            {total} people interested
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-none border border-white/15 bg-white/5 px-5 py-4">
      <div className="flex flex-col items-center gap-1">
        <Bell className="size-4 text-white/50" />
        <p className="text-sm text-white/70">Get notified when it starts</p>
        {total > 0 ? (
          <p className="text-xs text-white/40">
            {total} {total === 1 ? "person" : "people"} already interested
          </p>
        ) : null}
      </div>

      {!isSignedIn ? (
        <Input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email for show reminder"
          className="w-full rounded-none border-white/15 bg-black/40 text-white placeholder:text-white/30"
        />
      ) : null}

      {error ? (
        <p className="text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-white/20 bg-transparent text-white hover:bg-white/10"
        disabled={loading || (!isSignedIn && !email.trim())}
        onClick={onRegister}
      >
        {loading ? "Saving…" : "I'm interested"}
      </Button>
    </div>
  );
}

/** Ticks once a second toward `target`, or shows a live-soon pulse if there's
 *  no scheduled time (or it has already passed). */
function Countdown({
  target,
  host,
}: {
  target: number | null;
  host: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  const remaining = target != null ? Math.max(0, target - now) : 0;
  const parts = useMemo(() => splitDuration(remaining), [remaining]);

  const tickMs = remaining <= 0 ? null : parts.days > 0 ? 60_000 : 1_000;

  useEffect(() => {
    if (tickMs == null) return;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  if (target == null || remaining <= 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/60" />
          <span className="relative inline-flex size-2 rounded-full bg-white" />
        </span>
        <span className="text-sm text-white/80">
          {host} is about to go live
        </span>
      </div>
    );
  }

  const showDays = parts.days > 0;

  return (
    <div className="flex items-end gap-3 font-mono tabular-nums">
      {showDays && <Unit value={parts.days} label="days" />}
      <Unit value={parts.hours} label="hrs" />
      <Unit value={parts.minutes} label="min" />
      {!showDays && <Unit value={parts.seconds} label="sec" />}
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-4xl font-normal tracking-tight sm:text-5xl">
        {value.toString().padStart(2, "0")}
      </span>
      <span className="micro text-white/40">{label}</span>
    </div>
  );
}

function splitDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}
