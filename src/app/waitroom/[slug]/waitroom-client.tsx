"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useVisiblePoll } from "@/hooks/use-visible-poll";
import { readResponseJson } from "@/lib/fetch-json";
import type { PublicShow } from "@/lib/show-public";
import { viewerShowPath } from "@/lib/show-urls";

const POLL_MS = 5_000;

export default function WaitroomClient({
  initialShow,
}: {
  initialShow: PublicShow;
}) {
  const router = useRouter();
  const [show, setShow] = useState(initialShow);

  // The show may already have started (or finished) by the time this renders.
  useEffect(() => {
    if (show.status !== "scheduled") router.replace(viewerShowPath(show.slug));
  }, [router, show.slug, show.status]);

  // Poll the show's status. The instant the host goes live (or the show has
  // already ended and only its replay remains), hand off to /show/<slug>. Pauses
  // while the tab is hidden and catches up on return, so a waitroom left open
  // in a background tab is free — and still hands off the moment it's refocused.
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

  const host = show.hostName?.trim() || "The host";
  const initial = host.charAt(0).toUpperCase();
  const scheduledAt = show.scheduledFor ? Date.parse(show.scheduledFor) : null;

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-hidden bg-black px-6 py-16 text-center text-white">
      {/* Soft radial glow behind the content. */}
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

        <p className="max-w-sm text-sm text-white/40">
          Keep this page open — you&apos;ll be brought into the show
          automatically the moment {host} goes live.
        </p>
      </div>

      <Link href="/browse" className="relative">
        <Button variant="ghost" size="micro" className="text-white/60">
          Browse other shows
        </Button>
      </Link>
    </main>
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

  // Only tick while a countdown is actually on screen. With no target — or once
  // it has elapsed — this renders a pure-CSS pulse that ignores `now` entirely,
  // so a per-second re-render bought nothing. Past a day out the seconds unit is
  // hidden too, and a per-minute tick is enough to keep the display honest.
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
