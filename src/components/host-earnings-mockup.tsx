"use client";

import { useMemo, useState } from "react";
import { DollarSign, Radio, TrendingUp, Users } from "lucide-react";

import {
  estimateHostEarnings,
  sliderValueFromSubscribers,
  subscribersFromSliderValue,
  SUBSCRIBER_SLIDER_STEPS,
} from "@/lib/host-earnings-estimate";
import { formatCount, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEFAULT_SUBSCRIBERS = 25_000;

export function HostEarningsMockup({ className }: { className?: string }) {
  const [sliderValue, setSliderValue] = useState(() =>
    sliderValueFromSubscribers(DEFAULT_SUBSCRIBERS),
  );

  const subscribers = subscribersFromSliderValue(sliderValue);
  const estimate = useMemo(
    () => estimateHostEarnings(subscribers),
    [subscribers],
  );

  const barHeights = useMemo(() => {
    const base = estimate.monthlyEarnings / estimate.showsPerMonth;
    return Array.from({ length: estimate.showsPerMonth }, (_, index) => {
      const variance = 0.75 + ((index * 17) % 50) / 100;
      return Math.max(18, Math.round((base * variance) / estimate.monthlyEarnings * 100));
    });
  }, [estimate.monthlyEarnings, estimate.showsPerMonth]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <span className="micro text-muted-foreground">earnings estimate · demo</span>

      <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10 shadow-lg">
        <div className="flex items-center gap-2.5 border-b border-border/80 bg-muted/50 px-3 py-2.5">
          <div className="flex shrink-0 gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-[#FF5F57]" />
            <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="size-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center rounded-md bg-background px-3 py-1 ring-1 ring-foreground/8">
            <span className="micro truncate text-muted-foreground">
              frontrow.com/host/earnings
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <span className="micro text-muted-foreground">Estimated monthly</span>
            <p className="text-3xl font-medium tracking-tight text-live sm:text-4xl">
              {formatPrice(estimate.monthlyEarnings)}
            </p>
            <p className="text-sm text-muted-foreground">
              at {formatCount(subscribers)} followers
            </p>
          </div>

          <div className="flex items-end gap-1.5 sm:gap-2">
            {barHeights.map((height, index) => (
              <div
                key={index}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div
                  className="w-full rounded-md bg-live/80 transition-[height] duration-300 ease-out"
                  style={{ height: `${height}px` }}
                />
                <span className="micro text-muted-foreground">
                  W{index + 1}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatPill
              icon={Radio}
              label="Shows / month"
              value={String(estimate.showsPerMonth)}
            />
            <StatPill
              icon={Users}
              label="Avg viewers"
              value={formatCount(estimate.avgViewersPerShow)}
            />
            <StatPill
              icon={DollarSign}
              label="Per show"
              value={formatPrice(estimate.earningsPerShow)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label htmlFor="subscriber-slider" className="text-sm font-medium">
            Your audience size
          </label>
          <span className="micro text-live">{formatCount(subscribers)}</span>
        </div>

        <input
          id="subscriber-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderValue}
          onChange={(event) => setSliderValue(Number(event.target.value))}
          className="host-earnings-slider w-full"
          aria-valuemin={SUBSCRIBER_SLIDER_STEPS[0]}
          aria-valuemax={
            SUBSCRIBER_SLIDER_STEPS[SUBSCRIBER_SLIDER_STEPS.length - 1]
          }
          aria-valuenow={subscribers}
          aria-valuetext={`${formatCount(subscribers)} followers`}
        />

        <div className="mt-2 flex justify-between">
          <span className="micro text-muted-foreground">1K</span>
          <span className="micro text-muted-foreground">1M</span>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-live" strokeWidth={1.75} />
          Illustrative only — based on typical live-shopping attendance, conversion,
          and affiliate commission. Actual results vary by niche and show frequency.
        </p>
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Radio;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-background px-3 py-2.5 ring-1 ring-foreground/8">
      <Icon className="size-4 shrink-0 text-live" strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="micro text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
