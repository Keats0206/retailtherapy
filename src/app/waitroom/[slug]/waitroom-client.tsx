"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { PublicShow } from "@/lib/show-public";

const POLL_MS = 5_000;

export default function WaitroomClient({
  initialShow,
}: {
  initialShow: PublicShow;
}) {
  const router = useRouter();
  const [show, setShow] = useState(initialShow);

  // Poll the show's status. The instant the host goes live (or the show has
  // already ended and only its replay remains), hand off to /s/<slug>.
  useEffect(() => {
    if (show.status !== "scheduled") {
      router.replace(`/s/${show.slug}`);
      return;
    }
    const id = setInterval(async () => {
      const res = await fetch(`/api/shows/${show.slug}`);
      if (!res.ok) return;
      const next = (await res.json()) as PublicShow;
      if (next.status !== "scheduled") {
        router.replace(`/s/${next.slug}`);
      } else {
        setShow(next);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [router, show.slug, show.status]);

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const remaining = target != null ? Math.max(0, target - now) : 0;
  const parts = useMemo(() => splitDuration(remaining), [remaining]);

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
