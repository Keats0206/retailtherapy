import { cn } from "@/lib/utils";

/**
 * A single headline number. The form heuristic says one number with no trend
 * is a tile, not a chart — these carry the totals that sit above each chart.
 *
 * The delta chip pairs an arrow with the percentage so direction never depends
 * on color alone.
 */

type Props = {
  label: string;
  value: string;
  /** Percentage change vs. the previous equivalent period. */
  deltaPct?: number | null;
  hint?: string;
  className?: string;
};

export function StatTile({ label, value, deltaPct, hint, className }: Props) {
  const hasDelta = typeof deltaPct === "number" && Number.isFinite(deltaPct);
  const up = hasDelta && deltaPct > 0;
  const flat = hasDelta && deltaPct === 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      <span className="micro text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl leading-none font-normal tracking-tight tabular-nums">
          {value}
        </span>
        {hasDelta && !flat ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] leading-none font-medium tabular-nums",
              up ? "bg-live text-live-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {up ? "↑" : "↓"} {Math.abs(deltaPct)}%
          </span>
        ) : null}
      </div>
      {hint ? (
        <span className="text-xs leading-relaxed text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}
