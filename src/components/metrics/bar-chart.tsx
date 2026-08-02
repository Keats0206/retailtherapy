import { axisTicks, labelInterval, niceMax, type ChartPoint } from "./scale";
import { cn } from "@/lib/utils";

/**
 * Single-series bar chart, built from flex children rather than SVG so labels
 * stay crisp at any width and the whole thing reflows instead of scaling.
 *
 * One series, so no legend — the caption names it. Hover gives the exact value
 * through the native `title` tooltip, which keeps this a Server Component.
 */

type Props = {
  data: ChartPoint[];
  /** CSS color for the bars. Defaults to the chartreuse brand accent. */
  accent?: string;
  formatValue: (value: number) => string;
  /** Plot height in px — the axis column matches it. */
  height?: number;
  className?: string;
};

export function BarChart({
  data,
  accent = "var(--live)",
  formatValue,
  height = 200,
  className,
}: Props) {
  const max = niceMax(data.map((d) => d.value));
  const ticks = axisTicks(max);
  const every = labelInterval(data.length);

  return (
    <div className={cn("flex w-full gap-3", className)}>
      <div
        className="flex w-10 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-muted-foreground tabular-nums"
        style={{ height }}
        aria-hidden
      >
        {ticks.map((tick, i) => (
          <span key={i}>{formatValue(tick)}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {ticks.map((_, i) => (
            <div
              key={i}
              className="absolute inset-x-0 border-t border-foreground/5"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              aria-hidden
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((point, i) => (
              <div
                key={i}
                title={`${point.fullLabel} — ${formatValue(point.value)}`}
                className="group flex h-full min-w-0 flex-1 items-end"
              >
                <div
                  className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-70"
                  style={{
                    height: `${max > 0 ? (point.value / max) * 100 : 0}%`,
                    backgroundColor: accent,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 border-t border-foreground/20" aria-hidden />
        </div>

        <div className="mt-2 flex gap-[2px]" aria-hidden>
          {data.map((point, i) => (
            <span
              key={i}
              className="min-w-0 flex-1 truncate text-center text-[10px] leading-none text-muted-foreground"
            >
              {i % every === 0 ? point.label : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
