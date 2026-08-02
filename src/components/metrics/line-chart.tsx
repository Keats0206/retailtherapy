import { axisTicks, labelInterval, niceMax, type ChartPoint } from "./scale";
import { cn } from "@/lib/utils";

/**
 * Single-series line + area, for the secondary trends that sit under the
 * creator-hours headline.
 *
 * The path is drawn in a 0–100 unit space and stretched with
 * `preserveAspectRatio="none"`, so it fills any container width;
 * `vector-effect="non-scaling-stroke"` keeps the 2px stroke from stretching
 * with it. Axis text lives in HTML, outside the SVG, so it never distorts.
 */

type Props = {
  data: ChartPoint[];
  accent?: string;
  formatValue: (value: number) => string;
  height?: number;
  className?: string;
};

export function LineChart({
  data,
  accent = "var(--chart-2)",
  formatValue,
  height = 140,
  className,
}: Props) {
  const max = niceMax(data.map((d) => d.value));
  const ticks = axisTicks(max, 2);
  const every = labelInterval(data.length);

  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * 100 : 50);
  const y = (value: number) => (max > 0 ? 100 - (value / max) * 100 : 100);
  const points = data.map((point, i) => `${x(i)},${y(point.value)}`);
  const line = points.length > 0 ? `M${points.join(" L")}` : "";
  const area =
    points.length > 0
      ? `${line} L${x(data.length - 1)},100 L${x(0)},100 Z`
      : "";

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

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
          >
            {area ? <path d={area} fill={accent} opacity={0.12} /> : null}
            {line ? (
              <path
                d={line}
                fill="none"
                stroke={accent}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>

          {/* Hover targets are wider than the marks, per point. */}
          <div className="absolute inset-0 flex">
            {data.map((point, i) => (
              <div
                key={i}
                title={`${point.fullLabel} — ${formatValue(point.value)}`}
                className="min-w-0 flex-1 hover:bg-foreground/5"
              />
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 border-t border-foreground/20" aria-hidden />
        </div>

        <div className="mt-2 flex" aria-hidden>
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
