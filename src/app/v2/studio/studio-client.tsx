"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Camera,
  CameraOff,
  History,
  MessageCircle,
  Monitor,
  MonitorOff,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tag,
} from "lucide-react";

import {
  CinemaStage,
  type BubbleCorner,
  type BubbleShape,
  type ClickRipple,
  type Hotspot,
  type StageBackdrop,
  type StagePadding,
} from "@/components/cinema/cinema-stage";
import {
  ChatComposer,
  ChatFeed,
  useMockChat,
} from "@/components/cinema/chat-panel";
import { MobileViewer } from "@/components/cinema/mobile-viewer";
import { StreamVideo } from "@/components/cinema/stream-video";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCursorTelemetry, type TelemetrySource } from "@/hooks/use-cursor-telemetry";
import { useLocalScreenShare } from "@/hooks/use-local-screen-share";
import { useWebcamFace } from "@/hooks/use-webcam-face";
import { useZoomStage } from "@/hooks/use-zoom-stage";
import { PROTOTYPE_CATALOG } from "@/lib/cinema/prototype-catalog";
import { canTrackCursor, cursorTrackingHint, type CursorEvent } from "@/lib/cinema/telemetry";
import { cn } from "@/lib/utils";

const RIPPLE_LIFETIME_MS = 760;
/** How far back the "went past too fast" strip remembers. */
const RECENT_WINDOW_MS = 60_000;
/** Hotspots fade once the host has moved on. */
const HOTSPOT_LIFETIME_MS = 9_000;

type Side = "viewer" | "host";

type RecentItem = { key: string; productId: string; at: number };

export function StudioClient() {
  const screen = useLocalScreenShare();

  const [side, setSide] = useState<Side>("viewer");
  const [mobile, setMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // --- Look & feel knobs ---
  // Off by default: it's the loudest effect here, and you want to see the plain
  // composition first. The header toggle flips it without opening settings.
  const [autoZoom, setAutoZoom] = useState(false);
  const [zoomScale, setZoomScale] = useState(2);
  const [holdMs, setHoldMs] = useState(2600);
  const [showCursor, setShowCursor] = useState(true);
  const [showRipples, setShowRipples] = useState(true);

  const [camOn, setCamOn] = useState(true);
  const [faceZoom, setFaceZoom] = useState(1.4);
  const [bubbleShape, setBubbleShape] = useState<BubbleShape>("circle");
  const [bubbleCorner, setBubbleCorner] = useState<BubbleCorner>("bottom-left");
  const [bubbleSize, setBubbleSize] = useState(22);

  const [backdrop, setBackdrop] = useState<StageBackdrop>("aurora");
  const [padding, setPadding] = useState<StagePadding>("snug");
  const [cursorMode, setCursorMode] = useState<"auto" | "simulated" | "pointer">("auto");

  // --- Shopping state ---
  /** What the host is currently talking about; their clicks anchor it on screen. */
  const [activeProductId, setActiveProductId] = useState(PROTOTYPE_CATALOG[0].id);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  /** The host's own cart — viewers watch it fill while she browses. */
  const [hostCart, setHostCart] = useState<string[]>([]);

  const chat = useMockChat();

  const face = useWebcamFace({ enabled: camOn, zoom: faceZoom });
  const zoomConfig = useMemo(() => ({ zoomScale, holdMs }), [zoomScale, holdMs]);
  const stage = useZoomStage({ enabled: autoZoom, config: zoomConfig });

  const pointerUsable = canTrackCursor(screen.surface);
  const telemetrySource: TelemetrySource = !screen.sharing
    ? "none"
    : cursorMode === "pointer"
      ? "pointer"
      : cursorMode === "simulated"
        ? "simulated"
        : pointerUsable
          ? "pointer"
          : "simulated";

  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const rippleId = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  // The telemetry callback is stable and long-lived, so it reads the selection
  // from a ref rather than closing over it — synced here, not during render.
  const activeProductRef = useRef(activeProductId);
  useEffect(() => {
    activeProductRef.current = activeProductId;
  }, [activeProductId]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      fn();
      timers.current.delete(timer);
    }, ms);
    timers.current.add(timer);
  }, []);

  /**
   * A host click means two things at once: punch the zoom in there, and mark that
   * spot as "the product I'm on". The second is what makes the video shoppable —
   * no pixel analysis, just their product selection plus their cursor.
   */
  const handleEvent = useCallback(
    (event: CursorEvent) => {
      stage.pushEvent(event);
      if (event.k !== "c") return;

      if (showRipples) {
        const id = rippleId.current++;
        setRipples((prev) => [...prev, { id, x: event.x, y: event.y }]);
        later(() => setRipples((prev) => prev.filter((r) => r.id !== id)), RIPPLE_LIFETIME_MS);
      }

      const productId = activeProductRef.current;
      const product = PROTOTYPE_CATALOG.find((p) => p.id === productId);
      if (!product) return;

      const key = `${productId}-${event.t.toFixed(0)}`;
      setHotspots((prev) => [
        // One hotspot per product at a time; a new click relocates it.
        ...prev.filter((h) => h.id !== productId),
        {
          id: productId,
          x: event.x,
          y: event.y,
          label: product.name,
          price: product.price,
        },
      ]);
      later(
        () => setHotspots((prev) => prev.filter((h) => h.id !== productId)),
        HOTSPOT_LIFETIME_MS,
      );

      setRecent((prev) =>
        [{ key, productId, at: Date.now() }, ...prev.filter((r) => r.productId !== productId)].slice(0, 12),
      );
    },
    [later, showRipples, stage],
  );

  useCursorTelemetry({
    source: telemetrySource,
    surface: screen.surface,
    onEvent: handleEvent,
  });

  // Keep saved state mirrored onto the on-screen markers.
  const decoratedHotspots = useMemo(
    () => hotspots.map((h) => ({ ...h, saved: saved.includes(h.id) })),
    [hotspots, saved],
  );

  const grab = useCallback((hotspot: Hotspot) => {
    setSaved((prev) => (prev.includes(hotspot.id) ? prev : [...prev, hotspot.id]));
  }, []);

  // Expire the rewind strip on a timer rather than filtering by `Date.now()` at
  // render time — reading the clock during render isn't pure, and this also makes
  // items actually disappear instead of waiting for an unrelated re-render.
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - RECENT_WINDOW_MS;
      setRecent((prev) =>
        prev.some((r) => r.at <= cutoff) ? prev.filter((r) => r.at > cutoff) : prev,
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const faceBubble = camOn ? (
    // Mirrored on a wrapper so the selfie view reads naturally, leaving the
    // element's own transform free for the head-framing crop.
    <div className="h-full w-full scale-x-[-1]">
      <StreamVideo stream={face.stream} style={face.style} />
    </div>
  ) : null;

  const stageEl = (
    <CinemaStage
      screenStream={screen.stream}
      stageRef={stage.stageRef}
      cursorRef={stage.cursorRef}
      ripples={ripples}
      hotspots={decoratedHotspots}
      backdrop={backdrop}
      // A rim of backdrop on mobile so the drifting gradient is visible around
      // the player instead of being covered edge-to-edge by the video.
      padding={mobile ? "snug" : padding}
      showCursor={showCursor}
      faceBubble={faceBubble}
      bubbleCorner={bubbleCorner}
      bubbleShape={bubbleShape}
      bubbleSize={mobile ? Math.max(bubbleSize, 26) : bubbleSize}
      compact={mobile}
      animatedBackdrop={mobile}
      onHotspotClick={grab}
      className={mobile ? "rounded-none" : undefined}
      emptyState={
        // A viewer can't start a share — only the host can. Offering the button
        // here was the one genuinely backwards thing in this layout.
        <div className={cn("flex flex-col items-center", mobile ? "gap-2.5" : "gap-4")}>
          <p
            className={cn(
              "leading-relaxed text-white/70",
              mobile ? "max-w-[24ch] text-[11px]" : "max-w-sm text-sm",
            )}
          >
            Waiting for the host to share their screen. Once they do, this is where
            the auto-zoom and tappable products show up.
          </p>
        </div>
      }
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <div className="flex items-baseline gap-2">
            <Link href="/" className="font-brand text-xl uppercase tracking-[0.12em]">
              frontrow
            </Link>
            <Badge variant="secondary" size="micro">
              cinema prototype
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="micro hidden text-muted-foreground sm:inline">
              Preview as
            </span>
            <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1 ring-1 ring-foreground/8">
              {(
                [
                  ["viewer", "Viewer"],
                  ["host", "Host"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSide(value)}
                  aria-pressed={side === value}
                  className={cn(
                    "micro rounded-full px-3.5 py-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    side === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {side === "viewer" ? (
              <Button
                size="micro"
                variant={mobile ? "default" : "outline"}
                onClick={() => setMobile((m) => !m)}
              >
                <Smartphone className="size-3.5" /> Mobile
              </Button>
            ) : null}

            <Button
              size="micro"
              variant={autoZoom ? "default" : "outline"}
              onClick={() => setAutoZoom((z) => !z)}
            >
              <Sparkles className="size-3.5" /> Auto zoom {autoZoom ? "on" : "off"}
            </Button>

            <Button
              size="micro"
              variant={showSettings ? "default" : "outline"}
              onClick={() => setShowSettings((s) => !s)}
            >
              <SlidersHorizontal className="size-3.5" /> Settings
            </Button>

            <Button
              size="micro"
              variant={screen.sharing ? "outline" : "default"}
              onClick={() => (screen.sharing ? screen.stop() : void screen.start())}
              disabled={screen.starting}
            >
              {screen.sharing ? (
                <>
                  <MonitorOff className="size-3.5" /> Stop
                </>
              ) : (
                <>
                  <Monitor className="size-3.5" />{" "}
                  {screen.starting ? "Starting…" : "Share screen"}
                </>
              )}
            </Button>
            <Button size="micro" variant="outline" onClick={() => setCamOn((on) => !on)}>
              {camOn ? <CameraOff className="size-3.5" /> : <Camera className="size-3.5" />}
            </Button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto grid w-full max-w-[1600px] flex-1 gap-8 px-6 py-8",
          showSettings && "lg:grid-cols-[minmax(0,1fr)_320px]",
        )}
      >
        <div className="flex min-w-0 flex-col gap-6">
          {side === "viewer" ? (
            <ViewerSide
              mobile={mobile}
              stageEl={stageEl}
              phase={stage.phase}
              scale={stage.scale}
              autoZoom={autoZoom}
              sharing={screen.sharing}
              telemetrySource={telemetrySource}
              saved={saved}
              onSave={(id) =>
                setSaved((prev) => (prev.includes(id) ? prev : [...prev, id]))
              }
              onUnsave={(id) => setSaved((prev) => prev.filter((s) => s !== id))}
              recent={recent}
              hostCart={hostCart}
              chat={chat}
            />
          ) : (
            <HostSide
              screenStream={screen.stream}
              faceStream={face.stream}
              camOn={camOn}
              surfaceHint={cursorTrackingHint(screen.surface)}
              activeProductId={activeProductId}
              onSelectProduct={setActiveProductId}
              hostCart={hostCart}
              onToggleCart={(id) =>
                setHostCart((prev) =>
                  prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
                )
              }
              faceError={face.error}
              onStartShare={() => void screen.start()}
            />
          )}

          {screen.error ? (
            <p className="text-sm text-destructive">{screen.error}</p>
          ) : null}
        </div>

        {!showSettings ? null : (
        <aside className="flex flex-col gap-7 lg:sticky lg:top-24 lg:h-fit">
          <Group title="Auto zoom">
            <Range
              label="Zoom level"
              value={zoomScale}
              min={1.2}
              max={3.5}
              step={0.1}
              format={(v) => `${v.toFixed(1)}×`}
              onChange={setZoomScale}
            />
            <Range
              label="Hold after click"
              value={holdMs}
              min={800}
              max={6000}
              step={100}
              format={(v) => `${(v / 1000).toFixed(1)}s`}
              onChange={setHoldMs}
            />
            <Segmented
              label="Cursor input"
              value={cursorMode}
              options={[
                ["auto", "Auto"],
                ["pointer", "Real"],
                ["simulated", "Sim"],
              ]}
              onChange={setCursorMode}
            />
            <Toggle label="Show cursor" value={showCursor} onChange={setShowCursor} />
            <Toggle label="Click ripples" value={showRipples} onChange={setShowRipples} />
          </Group>

          <Group title="Face bubble">
            <Range
              label="Head crop"
              value={faceZoom}
              min={1}
              max={2.4}
              step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={setFaceZoom}
            />
            <Range
              label="Size"
              value={bubbleSize}
              min={12}
              max={34}
              step={1}
              format={(v) => `${v.toFixed(0)}%`}
              onChange={setBubbleSize}
            />
            <Segmented
              label="Shape"
              value={bubbleShape}
              options={[
                ["circle", "Circle"],
                ["squircle", "Squircle"],
              ]}
              onChange={setBubbleShape}
            />
            <Segmented
              label="Corner"
              value={bubbleCorner}
              options={[
                ["bottom-left", "BL"],
                ["bottom-right", "BR"],
                ["top-left", "TL"],
                ["top-right", "TR"],
              ]}
              onChange={setBubbleCorner}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {face.mode === "detected"
                ? "Tracking a detected face."
                : "No face detector in this browser — using a fixed head-position crop. Drop in a model to make it track."}
            </p>
          </Group>

          <Group title="Backdrop">
            <Segmented
              label="Preset"
              value={backdrop}
              options={[
                ["aurora", "Aurora"],
                ["sunset", "Sunset"],
                ["dusk", "Dusk"],
                ["mono", "Mono"],
              ]}
              onChange={setBackdrop}
            />
            <Segmented
              label="Inset"
              value={padding}
              options={[
                ["none", "None"],
                ["snug", "Snug"],
                ["roomy", "Roomy"],
              ]}
              onChange={setPadding}
            />
          </Group>

          <div className="soft-panel flex flex-col gap-2 p-4">
            <span className="micro text-muted-foreground">Try it</span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Share <strong className="text-foreground">this tab</strong>, set
              cursor input to Real, then click around. Each click zooms there and
              drops a tappable marker for whichever product is selected on the Host
              tab.
            </p>
          </div>
        </aside>
        )}
      </main>
    </div>
  );
}

/* --------------------------------- viewer --------------------------------- */

function ViewerSide({
  mobile,
  stageEl,
  phase,
  scale,
  autoZoom,
  sharing,
  telemetrySource,
  saved,
  onSave,
  onUnsave,
  recent,
  hostCart,
  chat,
}: {
  mobile: boolean;
  stageEl: React.ReactNode;
  phase: string;
  scale: number;
  autoZoom: boolean;
  sharing: boolean;
  telemetrySource: TelemetrySource;
  saved: string[];
  onSave: (id: string) => void;
  onUnsave: (id: string) => void;
  recent: RecentItem[];
  hostCart: string[];
  chat: ReturnType<typeof useMockChat>;
}) {
  const savedProducts = PROTOTYPE_CATALOG.filter((p) => saved.includes(p.id));
  const hostCartProducts = PROTOTYPE_CATALOG.filter((p) => hostCart.includes(p.id));

  if (mobile) {
    return (
      <MobileViewer
        stage={stageEl}
        savedProducts={savedProducts}
        onSave={onSave}
        onUnsave={onUnsave}
        recent={recent}
        hostCart={hostCartProducts}
        chat={chat}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="micro text-muted-foreground">Viewer sees</h2>
          {autoZoom ? (
            <span
              className={cn(
                "micro inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors",
                phase === "zoomed"
                  ? "bg-live/15 text-live-foreground ring-1 ring-live/30"
                  : "text-muted-foreground",
              )}
            >
              <Sparkles className="size-3" />
              {phase === "zoomed" ? `zoomed ${scale.toFixed(2)}×` : "full frame"}
            </span>
          ) : null}
        </div>
        {sharing ? (
          <span className="micro text-muted-foreground">
            {telemetrySource === "pointer" ? "real cursor" : "simulated cursor"}
          </span>
        ) : null}
      </div>

      {/*
        Player left, chat right — the shape every live viewer already knows. The
        player is capped rather than filling the column, because a screen share
        blown up to full width is both unreadable and unlike anything a real
        viewer would be looking at.
      */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="w-full max-w-[820px]">{stageEl}</div>
        </div>

        <div className="flex min-h-[420px] flex-col gap-2 rounded-xl p-3 ring-1 ring-foreground/8 xl:max-h-[560px]">
          <span className="micro inline-flex items-center gap-1.5 text-muted-foreground">
            <MessageCircle className="size-3" /> Live chat
          </span>
          <ChatFeed messages={chat.messages} className="min-h-0 flex-1" />
          <ChatComposer
            draft={chat.draft}
            setDraft={chat.setDraft}
            send={chat.send}
            className="shrink-0"
          />
        </div>
      </div>

      <section className="flex max-w-[820px] flex-col gap-3">
        <h2 className="micro inline-flex items-center gap-1.5 text-muted-foreground">
          <History className="size-3" /> Went past too fast
        </h2>
        <RecentStrip recent={recent} onGrab={onSave} />
      </section>

      <div className="grid max-w-[820px] gap-6 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="micro inline-flex items-center gap-1.5 text-muted-foreground">
            <ShoppingBag className="size-3" /> Her cart ({hostCartProducts.length})
          </h2>
          {hostCartProducts.length === 0 ? (
            <p className="soft-panel p-4 text-sm text-muted-foreground">
              Nothing in her cart yet. What the host adds while browsing shows up
              here live.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {hostCartProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ring-1 ring-foreground/8"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.brand} · {product.price}
                    </span>
                  </div>
                  <Button
                    size="micro"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => onSave(product.id)}
                  >
                    Add to mine
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="micro inline-flex items-center gap-1.5 text-muted-foreground">
            <Bookmark className="size-3" /> Your saved ({savedProducts.length})
          </h2>
          {savedProducts.length === 0 ? (
            <p className="soft-panel p-4 text-sm text-muted-foreground">
              Tap a marker on the stream to save it here without leaving the show.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {savedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ring-1 ring-foreground/8"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.brand} · {product.price}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="micro">Buy</Button>
                    <Button
                      size="micro"
                      variant="ghost"
                      onClick={() => onUnsave(product.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RecentStrip({
  recent,
  onGrab,
}: {
  recent: RecentItem[];
  onGrab: (id: string) => void;
}) {
  if (recent.length === 0) {
    return (
      <p className="soft-panel p-4 text-sm text-muted-foreground">
        Everything the host lands on shows up here for a minute, so viewers can
        pull back something that scrolled by.
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {recent.map((item) => {
        const product = PROTOTYPE_CATALOG.find((p) => p.id === item.productId);
        if (!product) return null;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onGrab(product.id)}
            className="flex shrink-0 flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left ring-1 ring-foreground/8 transition-colors hover:bg-muted/50"
          >
            <span className="max-w-[18ch] truncate text-sm">{product.name}</span>
            <span className="text-xs text-muted-foreground">{product.price}</span>
          </button>
        );
      })}
    </div>
  );
}


/* ---------------------------------- host ---------------------------------- */

function HostSide({
  screenStream,
  faceStream,
  camOn,
  surfaceHint,
  activeProductId,
  onSelectProduct,
  hostCart,
  onToggleCart,
  faceError,
  onStartShare,
}: {
  screenStream: MediaStream | null;
  faceStream: MediaStream | null;
  camOn: boolean;
  surfaceHint: string;
  onStartShare: () => void;
  activeProductId: string;
  onSelectProduct: (id: string) => void;
  hostCart: string[];
  onToggleCart: (id: string) => void;
  faceError: string | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="micro text-muted-foreground">Your broadcast monitor</h2>
          <span className="micro text-muted-foreground">
            what&rsquo;s captured, before viewer-side zoom
          </span>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Deliberately un-zoomed: the zoom happens on each viewer&rsquo;s device, so
          this is the full-resolution feed you&rsquo;re actually sending. Your real
          working view is the store itself.
        </p>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/8">
            {screenStream ? (
              <StreamVideo stream={screenStream} className="object-contain" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <span className="micro text-muted-foreground">not sharing</span>
                <Button size="micro" onClick={onStartShare}>
                  <Monitor className="size-3.5" /> Share screen
                </Button>
              </div>
            )}
          </div>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/8">
            {camOn ? (
              <div className="h-full w-full scale-x-[-1]">
                <StreamVideo stream={faceStream} className="object-cover" />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="micro text-muted-foreground">camera off</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{surfaceHint}</p>
        {faceError ? <p className="text-sm text-destructive">{faceError}</p> : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="micro inline-flex items-center gap-1.5 text-muted-foreground">
          <Tag className="size-3" /> Tagging as
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Pick what you&rsquo;re showing. Every click you make on the shared screen
          anchors this product there, so viewers get a tappable marker on the
          pixels instead of a link in chat.
        </p>
        <div className="flex flex-col gap-2">
          {PROTOTYPE_CATALOG.map((product) => {
            const inCart = hostCart.includes(product.id);
            return (
              <div
                key={product.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl pr-2 ring-1 transition-colors",
                  activeProductId === product.id
                    ? "bg-live/10 ring-live/40"
                    : "ring-foreground/8",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectProduct(product.id)}
                  aria-pressed={activeProductId === product.id}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.brand} · {product.price}
                    </span>
                  </div>
                  {activeProductId === product.id ? (
                    <Badge size="micro" className="shrink-0 bg-live text-live-foreground">
                      Tagging
                    </Badge>
                  ) : null}
                </button>
                <Button
                  size="micro"
                  variant={inCart ? "default" : "outline"}
                  className="shrink-0"
                  onClick={() => onToggleCart(product.id)}
                >
                  <ShoppingBag className="size-3.5" />
                  {inCart ? "In cart" : "Add"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}

/* ------------------------- tiny control primitives ------------------------- */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="micro text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex items-center justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          value ? "bg-live" : "bg-muted ring-1 ring-foreground/12",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-background shadow-sm transition-all",
            value ? "left-[1.125rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm">{label}</span>
        <span className="micro text-muted-foreground">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted outline-none ring-1 ring-foreground/8 accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1 ring-1 ring-foreground/8">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            aria-pressed={value === optionValue}
            className={cn(
              "micro flex-1 rounded-full px-2 py-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === optionValue
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
