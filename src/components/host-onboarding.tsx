"use client";

import { useState } from "react";
import {
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
  Sun,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EMPTY_DRAFT,
  type ShowIntent,
  type ShowSetupDraft,
} from "@/lib/show-setup";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type LucideIcon = typeof CloudSun;

const INTENTS: {
  id: ShowIntent;
  title: string;
  icon: LucideIcon;
  details: { label: string; icon: LucideIcon }[];
}[] = [
  {
    id: "season",
    title: "Season",
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
    title: "Event",
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
    title: "Browsing",
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

const setupChipClass = "h-9 gap-2 rounded-none px-3 text-sm";

function ChipEmoji({ emoji }: { emoji: string }) {
  return (
    <span
      className="inline-flex size-4 shrink-0 items-center justify-center text-base leading-none"
      aria-hidden
    >
      {emoji}
    </span>
  );
}

/** Compact setup form — intent, detail, and items on one surface. */
export function HostSetupPanel({
  draft,
  onPatch,
  className,
}: {
  draft: ShowSetupDraft;
  onPatch: (next: Partial<ShowSetupDraft>) => void;
  className?: string;
}) {
  const activeIntent = INTENTS.find((intent) => intent.id === draft.intent);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <section className="flex flex-col gap-2">
        <span className="micro text-muted-foreground">Shopping for</span>
        <div className="flex flex-wrap gap-2">
          {INTENTS.map((intent) => {
            const selected = draft.intent === intent.id;
            const Icon = intent.icon;
            return (
              <Button
                key={intent.id}
                type="button"
                variant={selected ? "secondary" : "outline"}
                aria-pressed={selected}
                className={setupChipClass}
                onClick={() => {
                  onPatch({ intent: intent.id, detail: null });
                  trackEvent(AnalyticsEvent.HOST_SETUP_INTENT, {
                    area: "host_setup",
                    intent: intent.id,
                  });
                }}
              >
                <Icon className="size-4" strokeWidth={1.5} />
                {intent.title}
              </Button>
            );
          })}
        </div>
      </section>

      {activeIntent && activeIntent.details.length > 0 ? (
        <section className="flex flex-col gap-2">
          <span className="micro text-muted-foreground">
            {draft.intent === "season" ? "Which season?" : "Occasion"}
          </span>
          <div className="flex flex-wrap gap-2">
            {activeIntent.details.map(({ label, icon: Icon }) => {
              const selected = draft.detail === label;
              return (
                <Button
                  key={label}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  aria-pressed={selected}
                  className={setupChipClass}
                  onClick={() => {
                    onPatch({ detail: selected ? null : label });
                    if (!selected) {
                      trackEvent(AnalyticsEvent.HOST_SETUP_DETAIL, {
                        area: "host_setup",
                        detail: label,
                      });
                    }
                  }}
                >
                  <Icon className="size-4" strokeWidth={1.5} />
                  {label}
                </Button>
              );
            })}
          </div>
        </section>
      ) : null}

      <ItemsSection draft={draft} onPatch={onPatch} />
    </div>
  );
}

function ItemsSection({
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

  return (
    <section className="flex flex-col gap-2">
      <span className="micro text-muted-foreground">Looking for</span>
      <div className="flex flex-wrap gap-2">
        {ITEM_OPTIONS.map(({ label, emoji }) => {
          const selected = draft.items.includes(label);
          return (
            <Button
              key={label}
              type="button"
              variant={selected ? "secondary" : "outline"}
              aria-pressed={selected}
              className={setupChipClass}
              onClick={() => toggle(label)}
            >
              <ChipEmoji emoji={emoji} />
              {label}
            </Button>
          );
        })}

        {customItems.map((item) => (
          <Button
            key={item}
            type="button"
            variant="secondary"
            className={setupChipClass}
            onClick={() => toggle(item)}
          >
            {item}
            <X className="size-4" />
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
            placeholder="Add item"
            className="h-9 w-32 rounded-none px-3 text-sm"
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            className={cn(setupChipClass, "border-dashed")}
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" />
            Add
          </Button>
        )}

        {draft.intent && draft.intent !== "browsing" ? (
          <Button
            type="button"
            variant={draft.items.length === 0 ? "secondary" : "outline"}
            aria-pressed={draft.items.length === 0}
            className={setupChipClass}
            onClick={() => onPatch({ items: [] })}
          >
            <ChipEmoji emoji="👀" />
            Just browsing
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** @deprecated Use HostSetupPanel inline on the launch screen. */
export function HostOnboarding({
  onComplete,
  finishLabel = "Continue to studio",
  initialDraft,
}: {
  onComplete: (draft: ShowSetupDraft) => void;
  finishLabel?: string;
  initialDraft?: ShowSetupDraft | null;
}) {
  const [draft, setDraft] = useState<ShowSetupDraft>(
    initialDraft ?? EMPTY_DRAFT,
  );

  const patch = (next: Partial<ShowSetupDraft>) =>
    setDraft((prev) => ({ ...prev, ...next }));

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      <HostSetupPanel draft={draft} onPatch={patch} />
      <div className="mt-6 flex justify-end">
        <Button
          disabled={!draft.intent}
          onClick={() => onComplete(draft)}
        >
          {finishLabel}
        </Button>
      </div>
    </div>
  );
}
