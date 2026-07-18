export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

/** Relative time like "in 2 days" / "3m ago". Call on the client to avoid SSR drift. */
export function formatRelative(iso: string | number): string {
  const target = typeof iso === "number" ? iso : new Date(iso).getTime();
  const diff = target - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const fmt = (v: number, unit: string) =>
    diff >= 0 ? `in ${v} ${unit}${v === 1 ? "" : "s"}` : `${v} ${unit}${v === 1 ? "" : "s"} ago`;
  if (mins < 60) return fmt(Math.max(1, mins), "min");
  if (hours < 24) return fmt(hours, "hour");
  return fmt(days, "day");
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
