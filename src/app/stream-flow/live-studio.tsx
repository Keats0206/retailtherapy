"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppWindow, Copy, Heart, MousePointerClick, PictureInPicture2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { HostPopout } from "./host-popout";
import { MOCK_CHAT, MOCK_SITES, type MockProduct } from "./mock";
import { BrowserWindow, CameraTile, LivePill, parseBudget } from "./pieces";
import { SharePicker } from "./share-picker";

export type ShowStats = {
  peakViewers: number;
  chatCount: number;
  pinnedCount: number;
  sitesVisited: number;
  durationSec: number;
};

type ChatLine = { id: number; author: string; text: string };

/**
 * Live, in two states: on air but not yet sharing, and on air while sharing.
 *
 * Splitting them is the whole point. Going live is cheap and instant; putting
 * your browsing on screen is the part that needs a guide. Hosts told us we'd
 * blurred the two together.
 */
export function LiveStudio({
  title,
  query,
  onEnd,
}: {
  title: string;
  query: string;
  onEnd: (stats: ShowStats) => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSiteId, setActiveSiteId] = useState(MOCK_SITES[0].id);
  const [visited, setVisited] = useState<string[]>([MOCK_SITES[0].id]);

  const [elapsed, setElapsed] = useState(0);
  const [viewers, setViewers] = useState(3);
  const [peak, setPeak] = useState(3);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [pinned, setPinned] = useState<MockProduct[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [hearts, setHearts] = useState<number[]>([]);

  const toastTimer = useRef<number | null>(null);
  const budget = parseBudget(query);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Viewers drift upward with jitter — a flat number reads as broken.
  useEffect(() => {
    const id = window.setInterval(() => {
      setViewers((current) => {
        const next = Math.max(1, current + Math.round(Math.random() * 4 - 1));
        setPeak((p) => Math.max(p, next));
        return next;
      });
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  // Chat only starts once there's something to watch.
  useEffect(() => {
    if (!sharing) return;
    let index = 0;
    const id = window.setInterval(() => {
      const line = MOCK_CHAT[index % MOCK_CHAT.length];
      index += 1;
      setChat((current) => [...current, { id: Date.now() + index, ...line }].slice(-40));
    }, 2300);
    return () => window.clearInterval(id);
  }, [sharing]);

  useEffect(() => {
    if (!sharing) return;
    const id = window.setInterval(() => {
      const key = Date.now();
      setHearts((current) => [...current, key].slice(-6));
      window.setTimeout(() => setHearts((c) => c.filter((h) => h !== key)), 2600);
    }, 1900);
    return () => window.clearInterval(id);
  }, [sharing]);

  function pinProduct(product: MockProduct) {
    setPinned((current) =>
      current.some((p) => p.id === product.id) ? current : [product, ...current],
    );
    flash(`Pinned ${product.brand} $${product.price}`);
  }

  function switchSite(siteId: string) {
    setActiveSiteId(siteId);
    setVisited((current) => (current.includes(siteId) ? current : [...current, siteId]));
  }

  function endShow() {
    onEnd({
      peakViewers: peak,
      chatCount: chat.length,
      pinnedCount: pinned.length,
      sitesVisited: visited.length,
      durationSec: elapsed,
    });
  }

  // On air, nothing on screen yet — one job, one button.
  if (!sharing) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 text-left sm:px-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <LivePill />
                <span className="text-sm text-muted-foreground">
                  {viewers} watching · {formatClock(elapsed)}
                </span>
              </div>
              <h1 className="font-heading text-3xl tracking-tight">
                You&apos;re live. Now put your browsing on screen.
              </h1>
              <p className="text-muted-foreground">
                Viewers can hear you — they just can&apos;t see what you&apos;re
                looking at yet.
              </p>
            </div>

            <ol className="flex flex-col">
              {[
                {
                  icon: AppWindow,
                  title: "Chrome will ask what to share",
                  body: "Choose the Window tab — not Entire Screen, not Chrome Tab.",
                },
                {
                  icon: MousePointerClick,
                  title: "Pick your Chrome window",
                  body: `The one with your ${MOCK_SITES.length} shopping tabs. Every site you open in it after that is already on stream.`,
                },
                {
                  icon: PictureInPicture2,
                  title: "Your controls pop out",
                  body: "A small window floats on top with chat, mic and the end button, so you can browse freely.",
                },
              ].map((step, i) => (
                <li
                  key={step.title}
                  className="flex gap-4 border-t border-border py-4 last:border-b"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center bg-muted">
                    <step.icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-sm font-medium">
                      {i + 1}. {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="shrink-0 border-t border-border">
          <Button
            variant="live"
            onClick={() => setPickerOpen(true)}
            className="h-20 w-full text-lg"
          >
            <AppWindow className="size-5" />
            Share my browser window
          </Button>
        </div>

        {pickerOpen ? (
          <SharePicker
            query={query}
            onCancel={() => setPickerOpen(false)}
            onShare={() => {
              setPickerOpen(false);
              setSharing(true);
              flash("You're on screen — controls are in the floating window");
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 bg-black">
      {/* The stage IS the shared browser window. Switching tabs is the show. */}
      <BrowserWindow
        activeSiteId={activeSiteId}
        onSiteChange={switchSite}
        query={query}
        budget={budget}
        pinnedIds={pinned.map((p) => p.id)}
        onPin={pinProduct}
      />

      <span className="micro pointer-events-none absolute left-3 top-3 z-20 bg-live px-2 py-1 text-live-foreground">
        On stream — viewers see this window
      </span>

      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText("https://frontrow.show/s/demo-show");
          flash("Viewer link copied");
        }}
        className="cinema-glass absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium hover:bg-black/70"
      >
        <Copy className="size-3.5" />
        Copy link
      </button>

      <CameraTile
        camOn={camOn}
        className="absolute bottom-4 left-4 z-20 aspect-square w-24 border border-white/60 sm:w-28"
      />

      <div className="pointer-events-none absolute bottom-6 left-32 z-20 flex flex-col gap-2">
        {hearts.map((key) => (
          <Heart key={key} className="size-5 animate-[demo-pin-in_700ms_ease-out] fill-pop text-pop" />
        ))}
      </div>

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <span className="cinema-glass-panel border px-4 py-2 text-sm">{toast}</span>
        </div>
      ) : null}

      <HostPopout
        title={title}
        elapsed={formatClock(elapsed)}
        viewers={viewers}
        chat={chat}
        pinned={pinned}
        micOn={micOn}
        camOn={camOn}
        onToggleMic={() => setMicOn((v) => !v)}
        onToggleCam={() => setCamOn((v) => !v)}
        onStopSharing={() => {
          setSharing(false);
          setPickerOpen(true);
        }}
        onEndShow={endShow}
      />

      {pickerOpen ? (
        <SharePicker
          query={query}
          onCancel={() => setPickerOpen(false)}
          onShare={() => {
            setPickerOpen(false);
            setSharing(true);
          }}
        />
      ) : null}
    </div>
  );
}

export function formatClock(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
