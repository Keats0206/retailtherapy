"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Intent = "season" | "event" | "browsing";
type ScreenId = "intent" | "detail" | "items" | "name";
type LucideIcon = typeof CloudSun;

const INTENTS: {
  id: Intent;
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

function namePool(draft: Draft): string[] {
  const key = draft.detail?.toLowerCase() ?? draft.intent ?? "browsing";
  return NAME_POOLS[key] ?? NAME_POOLS.browsing;
}

function screenTitle(screen: ScreenId, draft: Draft): string {
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

type Draft = {
  intent: Intent | null;
  /** Which season / which event, null until a chip is picked (optional). */
  detail: string | null;
  items: string[];
  showName: string;
  /** Typing by hand stops the auto-suggestion from clobbering the field. */
  nameTouched: boolean;
  socials: { instagram: string; tiktok: string; youtube: string };
};

const EMPTY_DRAFT: Draft = {
  intent: null,
  detail: null,
  items: [],
  showName: "",
  nameTouched: false,
  socials: { instagram: "", tiktok: "", youtube: "" },
};

export default function OnboardingClient() {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const patch = (next: Partial<Draft>) =>
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Mirrors the /prototype bar so hopping between flow and studio feels
          like one sandbox, not two pages. */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
        <div className="flex items-center gap-5">
          <Badge variant="secondary" size="micro">
            Prototype
          </Badge>
          <nav className="flex items-center gap-1">
            <Button size="micro" variant="secondary" aria-current="page">
              Onboarding
            </Button>
            <Button
              size="micro"
              variant="ghost"
              render={<Link href="/prototype?view=creator" />}
            >
              Creator
            </Button>
            <Button
              size="micro"
              variant="ghost"
              render={<Link href="/prototype?view=consumer" />}
            >
              Consumer
            </Button>
          </nav>
        </div>
        <span className="micro text-muted-foreground">
          Mock data · not connected
        </span>
      </div>

      {/* pb-24: Clerk's keyless-mode widget floats bottom-right and would sit
          on the footer buttons otherwise. */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 pt-10 pb-24">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="micro text-muted-foreground">
              Step {step + 1} of {order.length}
            </span>
            <Progress
              value={((step + 1) / order.length) * 100}
              className="w-32"
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

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-6">
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
              variant="live"
              className="h-12 gap-2 px-8 text-base"
              render={<Link href="/prototype?view=creator" />}
            >
              Start the show
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
  draft: Draft;
  onPatch: (next: Partial<Draft>) => void;
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
            onClick={() => onPatch({ intent: intent.id, detail: null })}
            className={cn(
              "flex min-h-44 flex-col gap-3 rounded-2xl p-6 text-left ring-1 transition-colors",
              active
                ? "bg-muted/60 ring-foreground/30"
                : "ring-foreground/8 hover:bg-muted/40",
            )}
          >
            <Icon
              className={cn("size-7", active ? "text-live" : "text-foreground")}
              strokeWidth={1.5}
            />
            <span className="mt-auto text-lg font-medium tracking-tight">
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
  draft: Draft;
  onPatch: (next: Partial<Draft>) => void;
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
            onClick={() => onPatch({ detail: selected ? null : label })}
            className={cn(
              "flex min-h-32 flex-col gap-3 rounded-2xl p-5 text-left ring-1 transition-colors",
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
            <span className="mt-auto text-base font-medium">{label}</span>
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
  draft: Draft;
  onPatch: (next: Partial<Draft>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");

  const toggle = (item: string) =>
    onPatch({
      items: draft.items.includes(item)
        ? draft.items.filter((i) => i !== item)
        : [...draft.items, item],
    });

  function commit() {
    const value = custom.trim();
    if (value && !draft.items.includes(value)) {
      onPatch({ items: [...draft.items, value] });
    }
    setCustom("");
  }

  const customItems = draft.items.filter((item) => !PRESET_LABELS.has(item));
  const chip = "h-10 gap-2 rounded-xl px-4 text-sm";

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
          className="h-10 w-56 rounded-xl"
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
  draft: Draft;
  onPatch: (next: Partial<Draft>) => void;
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
    if (!draft.nameTouched && draft.showName === "") suggest();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const socials: [keyof Draft["socials"], string, React.ReactNode][] = [
    ["instagram", "Instagram handle", <InstagramIcon key="ig" />],
    ["tiktok", "TikTok handle", <TikTokIcon key="tt" />],
    ["youtube", "YouTube handle", <YouTubeIcon key="yt" />],
  ];

  return (
    <div className="flex flex-col gap-10">
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

/**
 * Brand marks — this build of lucide ships no social icons, so these are
 * hand-rolled at the same 24-grid / currentColor as the rest of the set.
 */
function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4"
      aria-hidden
    >
      <path d="M16.5 3c.3 2.1 1.6 3.6 3.5 3.9v2.6c-1.3 0-2.5-.4-3.5-1.1v5.4c0 3.3-2.4 5.9-5.6 5.9S5.3 19.1 5.3 15.9c0-3.1 2.3-5.6 5.3-5.8v2.7c-1.4.2-2.6 1.4-2.6 3.1 0 1.7 1.1 3 2.8 3s2.9-1.3 2.9-3.2V3h2.5z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <path d="m9.75 15.02 5.75-3.27-5.75-3.27v6.54z" fill="currentColor" />
    </svg>
  );
}
