/**
 * Axis math shared by the metrics charts.
 *
 * Charts here are deliberately dependency-free: a bar chart is flex children
 * with percentage heights, a line chart is one SVG path. Both need the same
 * "round the top of the axis to a human number" logic, which lives here.
 */

/**
 * Smallest round number at or above the largest value, divisible into `steps`
 * equal ticks — so the axis reads 0/10/20/30/40 rather than 0/8.3/16.6/…
 */
export function niceMax(values: number[], steps = 4): number {
  const max = Math.max(0, ...values);
  if (max <= 0) return steps;

  const rough = max / steps;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;
  return step * steps;
}

/** Tick values from `max` down to 0, for a top-to-bottom axis column. */
export function axisTicks(max: number, steps = 4): number[] {
  return Array.from({ length: steps + 1 }, (_, i) => (max * (steps - i)) / steps);
}

/**
 * How often to print an x label so a 30-bucket axis doesn't collide. Always
 * labels the first bucket.
 */
export function labelInterval(count: number, maxLabels = 7): number {
  return Math.max(1, Math.ceil(count / maxLabels));
}

export type ChartPoint = {
  /** Short axis label, e.g. "Jul 3". */
  label: string;
  /** Full label used in the hover tooltip, e.g. "Week of Jul 3". */
  fullLabel: string;
  value: number;
};
