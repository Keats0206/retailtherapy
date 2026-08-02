"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CloudSun,
  Compass,
  Flower2,
  Gift,
  GraduationCap,
  Heart,
  Leaf,
  Music,
  Plus,
  Rocket,
  Snowflake,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/social-icons";
import {
  EMPTY_DRAFT,
  type ShowIntent,
  type ShowSetupDraft,
} from "@/lib/show-setup";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type ScreenId = "intent" | "detail" | "items" | "name";
type LucideIcon = typeof CloudSun;

const INTENTS: {
  id: ShowIntent;
  title: string;
  blurb: string;
  icon: LucideIcon;
  details: { label: string; icon: LucideIcon }[];
}[] = [
  {
    id: "season",
    title: "A season",
    blurb: "Fall layers, summer linen, dressing for the weather ahead.",
    icon: CloudSun,
    details: [
      { label: "Fall", icon: Leaf },
      { label: "Winter", icon: Snowflake },
      { label: "Spring", icon: Flower2 },
      { label: "Summer", icon: Sun },
    ],
  },
  {
    id: "event",
    title: "An event",
    blurb: "Something on the calendar needs an outfit.",
    icon: CalendarDays,
    details: [
      { label: "Wedding", icon: Heart },
      { label: "Festival", icon: Music },
      { label: "Holiday", icon: Gift },
      { label: "Back to school", icon: GraduationCap },
      { label: "Back to work", icon: Briefcase },
      { label: "New job", icon: Rocket },
    ],
  },
  {
    id: "browsing",
    title: "Just browsing",
    blurb: "No agenda, shopping out loud and seeing what lands.",
    icon: Compass,
    details: [],
  },
];

const ITEM_OPTIONS = [
  { label: "Jackets", emoji: "🧥" },
  { label: "Knitwear", emoji: "🧶" },
  { label: "Denim", emoji: "👖" },
  { label: "Dresses", emoji: "👗" },
  { label: "Shoes", emoji: "👟" },
  { label: "Bags", emoji: "👜" },
  { label: "Jewelry", emoji: "💍" },
  { label: "Accessories", emoji: "🕶️" },
] as const;

const PRESET_LABELS = new Set<string>(ITEM_OPTIONS.map((o) => o.label));

/**
 * Stands in for an AI naming call, keyed by the most specific answer we have.
 * Local and instant by nature, so `suggest` adds a short fake delay so the
 * "thinking" state is part of the design surface.
 */
const NAME_POOLS: Record<string, string[]> = {
  fall: ["layers incoming", "sweater weather watch", "the fall edit, live"],
  winter: ["coat season opens", "cold snap cart", "the winter warm-up"],
  spring: ["light layers only", "spring clean, new cart", "petal to the metal"],
  summer: ["heatwave haul", "linen season live", "out of office fits"],
  wedding: ["something borrowed live", "guest list dressing", "aisle be shopping"],
  festival: ["festival fits forever", "dust and glitter run", "main stage wardrobe"],
  holiday: ["holiday gifting spree", "wrapped and ready", "the gift list live"],
  "back to school": ["first day fits", "locker room refresh", "study hall haul"],
  "back to work": ["office era reboot", "commute-proof cart", "monday uniform hunt"],
  "new job": ["first day energy", "new badge, new bag", "dress for the offer"],
  season: ["four seasons, one cart", "weather permitting", "forecast: shopping"],
  event: ["save the date, save the look", "occasion incoming", "rsvp: shopping"],
  browsing: ["no agenda, all links", "just looking, kind of", "window shopping, live"],
};

function namePool(draft: ShowSetupDraft): string[] {
  const key = draft.detail?.toLowerCase() ?? draft.intent ?? "browsing";
  return NAME_POOLS[key] ?? NAME_POOLS.browsing;
}

function screenTitle(screen: ScreenId, draft: ShowSetupDraft): string {
  switch (screen) {
    case "intent":
      return "What are you shopping for?";
    case "detail":
      return draft.intent === "season"
        ? "Which season?"
        : "What’s the occasion?";
    case "items":
      return draft.intent === "browsing"
        ? "What items are you browsing?"
        : "What items are you looking for?";
    case "name":
      return "Name it & link up";
  }
}

export function HostOnboarding({
  onComplete,
  finishLabel = "Continue to studio",
  initialDraft,
}: {
  onComplete: (draft: ShowSetupDraft) => void;
  finishLabel?: string;
  /** Resume a previous draft (e.g. host tapped Edit on /host). */
  initialDraft?: ShowSetupDraft | null;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ShowSetupDraft>(
    initialDraft ?? EMPTY_DRAFT,
  );
  const [finishing, setFinishing] = useState(false);

  const patch = (next: Partial<ShowSetupDraft>) =>
    setDraft((prev) => ({ ...prev, ...next }));

  // Browsing has no season/event to pin down, so the detail screen drops out,
  // but it still gets an items page ("what are you browsing?"). The progress
  // bar re-bases to whatever the active path's length is.
  const order: ScreenId[] =
    draft.intent === "browsing"
      ? ["intent", "items", "name"]
      : ["intent", "detail", "items", "name"];
  const step = Math.min(stepIndex, order.length - 1);
  const screen = order[step];
  const last = screen === "name";
  const blocked = screen === "intent" && draft.intent === null;

  function finish() {
    if (finishing) return;
    setFinishing(true);
    onComplete(draft);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-6 px-6 pt-6 pb-6 sm:pt-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="micro text-muted-foreground">
              Step {step + 1} of {order.length}
            </span>
            <Progress
              value={((step + 1) / order.length) * 100}
              className="w-full"
            />
          </div>
          <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">
            {screenTitle(screen, draft)}
          </h1>
        </div>

        {screen === "intent" && <IntentStep draft={draft} onPatch={patch} />}
        {screen === "detail" && <DetailStep draft={draft} onPatch={patch} />}
        {screen === "items" && <ItemsStep draft={draft} onPatch={patch} />}
        {screen === "name" && <NameStep draft={draft} onPatch={patch} />}

        {/* pb-14: Clerk's keyless-mode widget floats bottom-right. */}
        <div className="mt-auto flex items-center justify-between gap-3 pb-14 pt-6">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStepIndex(step - 1)}>
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>
          ) : (
            <span />
          )}
          {last ? (
            <Button
              size="lg"
              className="h-12 gap-2 bg-live px-8 text-base text-live-foreground hover:bg-live/90"
              disabled={finishing}
              onClick={finish}
            >
              {finishLabel}
              <ArrowRight className="size-5" />
            </Button>
          ) : (
            <Button disabled={blocked} onClick={() => setStepIndex(step + 1)}>
              Continue
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function IntentStep({
  draft,
  onPatch,
}: {
  draft: ShowSetupDraft;
  onPatch: (next: Partial<ShowSetupDraft>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {INTENTS.map((intent) => {
        const active = draft.intent === intent.id;
        const Icon = intent.icon;
        return (
          <button
            key={intent.id}
            type="button"
            aria-pressed={active}
            // Detail chips differ per intent, so switching resets the pick.
            onClick={() => {
              onPatch({ intent: intent.id, detail: null });
              trackEvent(AnalyticsEvent.HOST_SETUP_INTENT, {
                area: "host_setup",
                intent: intent.id,
              });
            }}
            className={cn(
              "flex min-h-36 flex-col gap-2 rounded-none p-5 text-left ring-1 transition-colors",
              active
                ? "bg-muted/60 ring-foreground/30"
                : "ring-foreground/8 hover:bg-muted/40",
            )}
          >
            <Icon
              className={cn("size-7", active ? "text-live" : "text-foreground")}
              strokeWidth={1.5}
            />
            <span className="text-lg font-medium tracking-tight">
              {intent.title}
            </span>
            <span className="text-sm leading-relaxed text-muted-foreground">
              {intent.blurb}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DetailStep({
  draft,
  onPatch,
}: {
  draft: ShowSetupDraft;
  onPatch: (next: Partial<ShowSetupDraft>) => void;
}) {
  const active = INTENTS.find((intent) => intent.id === draft.intent);
  if (!active) return null;

  return (
    <div
      className={cn(
        "grid gap-3",
        active.id === "season"
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3",
      )}
    >
      {active.details.map(({ label, icon: Icon }) => {
        const selected = draft.detail === label;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              onPatch({ detail: selected ? null : label });
              if (!selected) {
                trackEvent(AnalyticsEvent.HOST_SETUP_DETAIL, {
                  area: "host_setup",
                  detail: label,
                });
              }
            }}
            className={cn(
              "flex min-h-28 flex-col gap-2 rounded-none p-4 text-left ring-1 transition-colors",
              selected
                ? "bg-muted/60 ring-foreground/30"
                : "ring-foreground/8 hover:bg-muted/40",
            )}
          >
            <Icon
              className={cn(
                "size-6",
                selected ? "text-live" : "text-foreground",
              )}
              strokeWidth={1.5}
            />
            <span className="text-base font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ItemsStep({
  draft,
  onPatch,
}: {
  draft: ShowSetupDraft;
  onPatch: (next: Partial<ShowSetupDraft>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");

  const toggle = (item: string) => {
    const selecting = !draft.items.includes(item);
    onPatch({
      items: selecting
        ? [...draft.items, item]
        : draft.items.filter((i) => i !== item),
    });
    if (selecting) {
      trackEvent(AnalyticsEvent.HOST_SETUP_ITEMS, {
        area: "host_setup",
        item,
      });
    }
  };

  function commit() {
    const value = custom.trim();
    if (value && !draft.items.includes(value)) {
      onPatch({ items: [...draft.items, value] });
    }
    setCustom("");
  }

  const customItems = draft.items.filter((item) => !PRESET_LABELS.has(item));
  const chip = "h-10 gap-2 rounded-none px-4 text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      {ITEM_OPTIONS.map(({ label, emoji }) => {
        const selected = draft.items.includes(label);
        return (
          <Button
            key={label}
            type="button"
            variant={selected ? "secondary" : "outline"}
            aria-pressed={selected}
            className={chip}
            onClick={() => toggle(label)}
          >
            <span className="text-base leading-none">{emoji}</span>
            {label}
          </Button>
        );
      })}

      {customItems.map((item) => (
        <Button
          key={item}
          type="button"
          variant="secondary"
          className={chip}
          onClick={() => toggle(item)}
        >
          {item}
          <X data-icon="inline-end" />
        </Button>
      ))}

      {adding ? (
        <Input
          value={custom}
          autoFocus
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setCustom("");
              setAdding(false);
            }
          }}
          onBlur={() => {
            commit();
            setAdding(false);
          }}
          placeholder="type an item, press enter"
          className="h-10 w-56 rounded-none"
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          className={cn(chip, "border-dashed")}
          onClick={() => setAdding(true)}
        >
          <Plus data-icon="inline-start" />
          Add your own
        </Button>
      )}

      {/* Only for season/event — under "just browsing" intent it'd be circular.
          Active precisely when nothing is picked: "pick nothing = browsing". */}
      {draft.intent !== "browsing" && (
        <Button
          type="button"
          variant={draft.items.length === 0 ? "secondary" : "outline"}
          aria-pressed={draft.items.length === 0}
          className={chip}
          onClick={() => onPatch({ items: [] })}
        >
          <span className="text-base leading-none">👀</span>
          Just browsing
        </Button>
      )}
    </div>
  );
}

function NameStep({
  draft,
  onPatch,
}: {
  draft: ShowSetupDraft;
  onPatch: (next: Partial<ShowSetupDraft>) => void;
}) {
  const [thinking, setThinking] = useState(false);
  const poolIndex = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggest = useCallback(() => {
    const pool = namePool(draft);
    const next = pool[poolIndex.current % pool.length];
    poolIndex.current += 1;
    setThinking(true);
    timer.current = setTimeout(() => {
      onPatch({ showName: next, nameTouched: false });
      setThinking(false);
    }, 350);
    // Reading `draft` freshly each call is fine — this only fires on click/mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.intent, draft.detail, onPatch]);

  // Draft a name on arrival, but never over a name the host typed (or cleared)
  // themselves — coming Back and returning keeps whatever was there.
  useEffect(() => {
    if (!draft.nameTouched && draft.showName === "") {
      queueMicrotask(() => suggest());
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const socials: [keyof ShowSetupDraft["socials"], string, React.ReactNode][] = [
    ["instagram", "Instagram handle", <InstagramIcon key="ig" />],
    ["tiktok", "TikTok handle", <TikTokIcon key="tt" />],
    ["youtube", "YouTube handle", <YouTubeIcon key="yt" />],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="micro text-muted-foreground">Show title</span>
        {/* Reads as an editable page title, not a form field. */}
        <input
          id="ob-show-name"
          value={thinking ? "" : draft.showName}
          onChange={(e) =>
            onPatch({ showName: e.target.value, nameTouched: true })
          }
          placeholder={thinking ? "thinking…" : "name your show"}
          disabled={thinking}
          autoComplete="off"
          className="w-full border-0 bg-transparent p-0 text-3xl font-normal tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-100 sm:text-4xl"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 w-fit"
          disabled={thinking}
          onClick={suggest}
        >
          <Sparkles data-icon="inline-start" />
          Suggest another
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <span className="micro text-muted-foreground">Social links</span>
        {socials.map(([key, label, icon]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
              {icon}
            </span>
            <span className="text-sm text-muted-foreground">@</span>
            <Input
              value={draft.socials[key]}
              aria-label={label}
              onChange={(e) =>
                onPatch({ socials: { ...draft.socials, [key]: e.target.value } })
              }
              placeholder="handle"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
