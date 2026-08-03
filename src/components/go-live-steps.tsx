"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The two things a host does after they're live: open a store in its own
 * window, then share that window. Ordered rather than a loose row of buttons —
 * sharing before opening a store means sharing an empty desktop.
 */
export const POST_LIVE_STEPS = [
  {
    id: "store",
    title: "Open a store",
    hint: "Opens in its own window — that's the window you'll share.",
  },
  {
    id: "share",
    title: "Share your screen",
    hint: "Pick Window (not Tab) so you can switch between stores.",
  },
] as const;

export type PostLiveStepId = (typeof POST_LIVE_STEPS)[number]["id"];

export type PostLiveProgress = Record<PostLiveStepId, boolean>;

/** First unfinished step — the only one that gets its action rendered. */
export function currentPostLiveStep(
  progress: PostLiveProgress,
): PostLiveStepId | null {
  return POST_LIVE_STEPS.find((step) => !progress[step.id])?.id ?? null;
}

export function PostLiveSteps({
  progress,
  actions,
  className,
}: {
  progress: PostLiveProgress;
  /** Per-step control, shown only while that step is the current one. */
  actions?: Partial<Record<PostLiveStepId, React.ReactNode>>;
  className?: string;
}) {
  const current = currentPostLiveStep(progress);

  return (
    <ol className={cn("flex flex-col", className)}>
      {POST_LIVE_STEPS.map((step, i) => {
        const done = progress[step.id];
        const active = step.id === current;
        const action = active ? actions?.[step.id] : null;

        return (
          <li
            key={step.id}
            className={cn(
              "flex gap-3 border-l-2 py-2.5 pl-3 transition-colors",
              active
                ? "border-live"
                : done
                  ? "border-live/30"
                  : "border-foreground/10",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                done
                  ? "bg-live text-live-foreground"
                  : active
                    ? "bg-foreground text-background"
                    : "bg-foreground/10 text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <span
                  className={cn(
                    "text-sm font-medium",
                    done
                      ? "text-muted-foreground line-through"
                      : active
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
                {active ? (
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {step.hint}
                  </span>
                ) : null}
              </div>
              {action}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
