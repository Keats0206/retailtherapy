"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { LiveStudio, formatClock, type ShowStats } from "./live-studio";
import { MOCK_MISSIONS, MOCK_SITES } from "./mock";
import { CameraTile } from "./pieces";

type Phase = "ready" | "live" | "recap";

/**
 * Stream flow — prototype.
 *
 * Two things hosts told us were confusing: going live, and sharing a screen. So
 * this splits them instead of blurring them. Going live is instant. Sharing is
 * a guided step with its own screen, because Chrome's picker can't be skipped —
 * only explained.
 *
 * The other shift: a show is a *hunt* ("white tank tops under $40"), not a
 * store. Hosts browse across four sites in one show, which is precisely why the
 * thing they share is the whole browser window, and why controls have to leave
 * the page and float on top.
 *
 * Nothing streams. No LiveKit, no getUserMedia, no persistence — see `mock.ts`.
 */
export function StreamFlowClient() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<ShowStats | null>(null);

  const mission = query.trim();
  const title = mission || "Untitled hunt";

  function restart() {
    setPhase("ready");
    setQuery("");
    setStats(null);
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="text-base font-bold uppercase tracking-widest">
            frontrow
          </Link>
          <span className="micro shrink-0 bg-muted px-2 py-1 text-muted-foreground">
            stream flow · prototype
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PhaseDots phase={phase} />
          <Button size="micro" variant="ghost" onClick={restart}>
            <RotateCcw className="size-3.5" />
            Restart
          </Button>
        </div>
      </header>

      {phase === "ready" ? (
        <ReadyScreen
          query={query}
          onQueryChange={setQuery}
          onGoLive={() => setPhase("live")}
        />
      ) : null}

      {phase === "live" ? (
        <LiveStudio
          title={title}
          query={mission || MOCK_MISSIONS[0]}
          onEnd={(result) => {
            setStats(result);
            setPhase("recap");
          }}
        />
      ) : null}

      {phase === "recap" && stats ? (
        <RecapScreen title={title} stats={stats} onRestart={restart} />
      ) : null}
    </main>
  );
}

/**
 * One question: what are you hunting for? No store to pick — the hunt spans
 * sites, and which sites is something the host figures out on air.
 */
function ReadyScreen({
  query,
  onQueryChange,
  onGoLive,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onGoLive: () => void;
}) {
  const ready = query.trim().length > 2;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-col gap-2">
            <span className="micro text-muted-foreground">New show</span>
            <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
              What are you hunting for?
            </h1>
            <p className="text-muted-foreground">
              This is your show title and what viewers came for. You&apos;ll
              browse wherever you like once you&apos;re on.
            </p>
          </div>

          <div className="flex items-center gap-3 border-b-2 border-foreground pb-3">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="White tank tops under $40"
              aria-label="What are you hunting for?"
              className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-medium tracking-tight shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-3">
            <p className="micro text-muted-foreground">Or start from one of these</p>
            <div className="flex flex-wrap gap-px bg-border">
              {MOCK_MISSIONS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => onQueryChange(idea)}
                  className={cn(
                    "bg-background px-3 py-2 text-sm transition-colors hover:bg-muted",
                    query === idea && "bg-foreground text-background hover:bg-foreground",
                  )}
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-6">
            <CameraTile camOn className="size-14 shrink-0" />
            <div className="flex min-w-0 flex-col">
              <p className="text-sm font-medium">Camera and mic ready</p>
              <p className="text-sm text-muted-foreground">
                You&apos;ll put your browsing on screen right after you go live.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Docked, full-bleed, square. The only action on the screen is always
          under the thumb — it never scrolls out of reach. */}
      <div className="shrink-0 border-t border-border">
        <Button
          variant="live"
          disabled={!ready}
          onClick={onGoLive}
          className="h-20 w-full text-lg"
        >
          {ready ? "Go live" : "Say what you're hunting for"}
        </Button>
        <p className="micro bg-muted/40 py-2 text-center text-muted-foreground">
          Going live takes a second. Sharing your screen is the next step.
        </p>
      </div>
    </div>
  );
}

function RecapScreen({
  title,
  stats,
  onRestart,
}: {
  title: string;
  stats: ShowStats;
  onRestart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  function copyReplay() {
    void navigator.clipboard?.writeText("https://frontrow.show/s/demo-show");
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  const cells = [
    { label: "Peak viewers", value: String(stats.peakViewers) },
    { label: "Messages", value: String(stats.chatCount) },
    { label: "Pinned", value: String(stats.pinnedCount) },
    {
      label: "Sites browsed",
      value: `${stats.sitesVisited}/${MOCK_SITES.length}`,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-1">
            <span className="micro text-muted-foreground">
              Show ended · {formatClock(stats.durationSec)}
            </span>
            <h1 className="font-heading text-3xl tracking-tight">{title}</h1>
            <p className="text-muted-foreground">
              Replay and the pinned trail are on your show page — nothing else to do.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
            {cells.map((cell) => (
              <div key={cell.label} className="bg-background p-4">
                <p className="text-2xl font-medium tabular-nums">{cell.value}</p>
                <p className="micro text-muted-foreground">{cell.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-px border-t border-border bg-border sm:flex-row">
        <Button
          variant="outline"
          onClick={copyReplay}
          className="h-16 flex-1 border-0 text-base"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy replay link"}
        </Button>
        <Button variant="live" onClick={onRestart} className="h-16 flex-1 text-base">
          Start another hunt
        </Button>
      </div>
    </div>
  );
}

function PhaseDots({ phase }: { phase: Phase }) {
  const order: Phase[] = ["ready", "live", "recap"];
  const index = order.indexOf(phase);
  return (
    <div className="flex items-center gap-1.5 pr-1">
      {order.map((key, i) => (
        <span
          key={key}
          className={cn(
            "size-1.5 transition-colors",
            i === index ? "bg-live" : i < index ? "bg-foreground/40" : "bg-foreground/15",
          )}
        />
      ))}
    </div>
  );
}
