/**
 * Display helpers for challenge events, split out of `lib/challenges.ts` so
 * client components can use them — that module is server-only.
 */

/** "$500" — whole dollars, since budgets are set in round numbers. */
export function formatBudget(amount: number, currency = "usd"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "15 min" / "1 hr" — the clock half of the format. */
export function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
}

/** The one-line format summary: "15 min · $500 · Net-a-Porter". */
export function formatBrief(challenge: {
  durationSeconds: number | null;
  budget: number;
  currency: string;
  brandName: string;
}): string {
  return [
    formatDuration(challenge.durationSeconds),
    formatBudget(challenge.budget, challenge.currency),
    challenge.brandName,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * "Live now" / "Tue 7:00 PM" / "Wrapped" — what to put on the card's date
 * line. Upcoming events read as a slot on the calendar; anything already open
 * reads as an invitation.
 */
export function formatSchedule(
  challenge: { state: string; startsAt: string | null },
  now = new Date(),
): string | null {
  if (challenge.state === "closed") return "Wrapped";
  if (challenge.state === "open") return "Open now";
  if (!challenge.startsAt) return null;

  const starts = new Date(challenge.startsAt);
  const sameDay = starts.toDateString() === now.toDateString();
  return sameDay
    ? `Today ${starts.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : starts.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}
