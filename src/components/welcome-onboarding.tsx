"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Radio, ShoppingBag, Sparkles } from "lucide-react";

import {
  ChipEmoji,
  ITEM_OPTIONS,
  setupChipClass,
} from "@/components/host-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { ONBOARDING_BRANDS } from "@/lib/onboarding-brands";
import type { ShowSocials } from "@/lib/show-setup";
import { cn } from "@/lib/utils";

/**
 * First-run onboarding at /welcome.
 *
 * Deliberately built from the same parts as the pre-show setup screen — the
 * chip metric, the `micro` eyebrow labels, the square corners — so the first
 * screen someone sees already teaches them how the rest of the app reads.
 *
 * One step per screen, and every step is required: this runs once, and a
 * profile with nothing in it is worth less than the twenty seconds it saves.
 *
 * State is local only. Unlike the host's show draft there is no sessionStorage
 * round trip, because a draft surviving a re-signup would be a bug.
 */

type Intent = "shop" | "host" | "both";

const MIN_BRANDS = 3;

const INTENTS: { id: Intent; title: string; blurb: string; icon: typeof Radio }[] =
  [
    {
      id: "shop",
      title: "I'm here to shop",
      blurb: "Watch, vote, and grab what you like.",
      icon: ShoppingBag,
    },
    {
      id: "host",
      title: "I want to stream",
      blurb: "Go live and shop in front of a room.",
      icon: Radio,
    },
    {
      id: "both",
      title: "Both",
      blurb: "Watch for now, go live when you're ready.",
      icon: Sparkles,
    },
  ];

const EMPTY_SOCIALS: ShowSocials = { instagram: "", tiktok: "", youtube: "" };

const SOCIAL_FIELDS: { key: keyof ShowSocials; label: string; placeholder: string }[] =
  [
    { key: "instagram", label: "Instagram", placeholder: "@you" },
    { key: "tiktok", label: "TikTok", placeholder: "@you" },
    { key: "youtube", label: "YouTube", placeholder: "@you" },
  ];

type Draft = {
  intent: Intent | null;
  brands: string[];
  categories: string[];
  socials: ShowSocials;
};

const EMPTY_DRAFT: Draft = {
  intent: null,
  brands: [],
  categories: [],
  socials: EMPTY_SOCIALS,
};

/** Step ids rather than indexes — the socials step is skipped for shoppers. */
type StepId = "intent" | "brands" | "categories" | "socials" | "done";

function stepsFor(intent: Intent | null): StepId[] {
  const wantsToHost = intent === "host" || intent === "both";
  return wantsToHost
    ? ["intent", "brands", "categories", "socials", "done"]
    : ["intent", "brands", "categories", "done"];
}

function hasAnySocial(socials: ShowSocials): boolean {
  return Boolean(
    socials.instagram.trim() || socials.tiktok.trim() || socials.youtube.trim(),
  );
}

export function WelcomeOnboarding({ firstName }: { firstName: string | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = stepsFor(draft.intent);
  // Changing intent can shorten the flow underneath us; clamp rather than
  // letting the index run off the end.
  const current = steps[Math.min(stepIndex, steps.length - 1)] ?? "intent";
  const wantsToHost = draft.intent === "host" || draft.intent === "both";

  function patch(next: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function toggle(key: "brands" | "categories", value: string) {
    const selected = draft[key].includes(value);
    patch({
      [key]: selected
        ? draft[key].filter((item) => item !== value)
        : [...draft[key], value],
    });
  }

  const canContinue = (() => {
    switch (current) {
      case "intent":
        return draft.intent !== null;
      case "brands":
        return draft.brands.length >= MIN_BRANDS;
      case "categories":
        return draft.categories.length > 0;
      case "socials":
        return hasAnySocial(draft.socials);
      case "done":
        return true;
    }
  })();

  function goNext() {
    if (current === "done") {
      void submit();
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    trackEvent(AnalyticsEvent.ONBOARDING_STEP, {
      area: "onboarding",
      step: steps[next] ?? "done",
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: draft.intent,
          brands: draft.brands,
          categories: draft.categories,
          socials: draft.socials,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(payload.error ?? "Couldn't save your answers. Try again.");
        return;
      }

      trackEvent(AnalyticsEvent.ONBOARDING_COMPLETE, {
        area: "onboarding",
        intent: draft.intent ?? "shop",
        brands: draft.brands.length,
      });
      // The gate reads Clerk metadata, which the server just wrote — refresh so
      // /browse is reachable instead of bouncing straight back here.
      router.refresh();
      router.push("/browse");
    } catch {
      setError("Couldn't reach the server. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-2">
        <span className="micro text-muted-foreground">
          {current === "done"
            ? "welcome to frontrow"
            : `Step ${stepIndex + 1} of ${steps.length}`}
        </span>
        {renderHeading(current, draft, firstName)}
      </div>

      {current === "intent" ? (
        <section className="flex flex-col gap-2">
          <span className="micro text-muted-foreground">What brings you in</span>
          <div className="flex flex-col gap-2">
            {INTENTS.map(({ id, title, blurb, icon: Icon }) => {
              const selected = draft.intent === id;
              return (
                <Button
                  key={id}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  aria-pressed={selected}
                  className="h-auto justify-start gap-3 rounded-none px-4 py-3 text-left"
                  onClick={() => {
                    patch({ intent: id });
                    trackEvent(AnalyticsEvent.ONBOARDING_INTENT, {
                      area: "onboarding",
                      intent: id,
                    });
                  }}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.5} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">{title}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {blurb}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </section>
      ) : null}

      {current === "brands" ? (
        <section className="flex flex-col gap-2">
          <span className="micro text-muted-foreground">
            Brands · {draft.brands.length}/{MIN_BRANDS}
          </span>
          <div className="flex flex-wrap gap-2">
            {ONBOARDING_BRANDS.map(({ slug, name }) => {
              const selected = draft.brands.includes(slug);
              return (
                <Button
                  key={slug}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  aria-pressed={selected}
                  className={cn(setupChipClass, "h-10 px-4")}
                  onClick={() => toggle("brands", slug)}
                >
                  {name}
                </Button>
              );
            })}
          </div>
        </section>
      ) : null}

      {current === "categories" ? (
        <section className="flex flex-col gap-2">
          <span className="micro text-muted-foreground">Looking for</span>
          <div className="flex flex-wrap gap-2">
            {ITEM_OPTIONS.map(({ label, emoji }) => {
              const selected = draft.categories.includes(label);
              return (
                <Button
                  key={label}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  aria-pressed={selected}
                  className={setupChipClass}
                  onClick={() => toggle("categories", label)}
                >
                  <ChipEmoji emoji={emoji} />
                  {label}
                </Button>
              );
            })}
          </div>
        </section>
      ) : null}

      {current === "socials" ? (
        <section className="flex flex-col gap-3">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{label}</span>
              <Input
                value={draft.socials[key]}
                onChange={(e) =>
                  patch({ socials: { ...draft.socials, [key]: e.target.value } })
                }
                placeholder={placeholder}
                autoComplete="off"
                className="rounded-none"
              />
            </label>
          ))}
        </section>
      ) : null}

      {current === "done" ? (
        <div className="soft-panel flex flex-col gap-2 p-4">
          <span className="micro text-muted-foreground">What happens next</span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {wantsToHost
              ? "We read every application. Browse while we look at yours — you'll hear from us by email."
              : "Shows run live. Drop in, ask what something costs, and vote on whether it's worth it."}
          </p>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-4 pt-2">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between">
          {stepIndex > 0 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            >
              Back
            </Button>
          ) : (
            <span />
          )}

          <Button
            type="button"
            className="gap-2"
            disabled={!canContinue || submitting}
            onClick={goNext}
          >
            {current === "done"
              ? submitting
                ? "Setting up…"
                : "Start watching"
              : "Continue"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}

function renderHeading(
  step: StepId,
  draft: Draft,
  firstName: string | null,
): React.ReactNode {
  const wantsToHost = draft.intent === "host" || draft.intent === "both";

  switch (step) {
    case "intent":
      return (
        <>
          <h1 className="text-2xl font-normal tracking-tight">
            taste is a person, not an algorithm.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            No recommendation engine ever loved a jacket. The people here do.
            {firstName ? ` Good to have you, ${firstName}.` : ""}
          </p>
        </>
      );
    case "brands":
      return (
        <>
          <h1 className="text-2xl font-normal tracking-tight">
            Who already has your number?
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pick at least three. It&rsquo;s how we find you people shopping
            where you shop.
          </p>
        </>
      );
    case "categories":
      return (
        <>
          <h1 className="text-2xl font-normal tracking-tight">
            What are you actually looking for?
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Rough is fine. You can change your mind mid-show &mdash; everyone
            does.
          </p>
        </>
      );
    case "socials":
      return (
        <>
          <h1 className="text-2xl font-normal tracking-tight">
            Where do you post?
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Any size welcome &mdash; if you&rsquo;re excited, we want to hear
            from you.
          </p>
        </>
      );
    case "done":
      return (
        <>
          <h1 className="text-2xl font-normal tracking-tight">
            {wantsToHost ? "You're in. Your application's with us." : "You're in."}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Real people, live, spending their own money on things they actually
            chose. Nothing here was ranked by a model.
          </p>
        </>
      );
  }
}
