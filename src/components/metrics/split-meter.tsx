import { cn } from "@/lib/utils";

/**
 * Two-part share bar — buy vs. skip votes. A 2px surface gap separates the
 * segments, and both are directly labeled, so the split reads without a legend
 * and without relying on color.
 */

type Props = {
  left: { label: string; value: number; accent?: string };
  right: { label: string; value: number; accent?: string };
  className?: string;
};

export function SplitMeter({ left, right, className }: Props) {
  const total = left.value + right.value;
  const leftPct = total > 0 ? (left.value / total) * 100 : 50;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        <div
          style={{
            width: `${leftPct}%`,
            backgroundColor: left.accent ?? "var(--live)",
          }}
          title={`${left.label} — ${left.value}`}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: right.accent ?? "var(--muted)" }}
          title={`${right.label} — ${right.value}`}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>
          {left.label} {left.value.toLocaleString("en-US")}
          {total > 0 ? ` · ${Math.round(leftPct)}%` : ""}
        </span>
        <span>
          {right.label} {right.value.toLocaleString("en-US")}
        </span>
      </div>
    </div>
  );
}
