"use client";

import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type WrapUpStep = {
  id: string;
  label: string;
  done: boolean;
  active?: boolean;
  /** Shown while pending instead of `label`. */
  pending?: string | null;
};

export function ShowWrapUpSteps({
  steps,
  className,
}: {
  steps: WrapUpStep[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {steps.map((step) => (
        <li key={step.id} className="flex items-center gap-2.5 text-sm">
          {step.done ? (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-none bg-live/15 text-live">
              <Check className="size-3" />
            </span>
          ) : step.active ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <span className="size-5 shrink-0 rounded-none border border-border" />
          )}
          <span
            className={cn(
              step.done || step.active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {step.done ? step.label : (step.pending ?? step.label)}
          </span>
        </li>
      ))}
    </ul>
  );
}
