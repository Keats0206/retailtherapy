import type { CreatorRow } from "@/lib/metrics";

/**
 * Creator leaderboard for the selected range, ranked by hours.
 *
 * A plain semantic table — there is no shadcn `table` primitive in this repo
 * and one row type doesn't justify adding one. Scrolls inside its own
 * container so the page body never scrolls sideways.
 */

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function LeaderboardTable({ rows }: { rows: CreatorRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        No creators went live in this range.
      </p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="micro py-2 pr-4 font-medium text-muted-foreground">
              Creator
            </th>
            <th className="micro py-2 pr-4 text-right font-medium text-muted-foreground">
              Hours
            </th>
            <th className="micro py-2 pr-4 text-right font-medium text-muted-foreground">
              Shows
            </th>
            <th className="micro py-2 pr-4 text-right font-medium text-muted-foreground">
              Avg session
            </th>
            <th className="micro py-2 text-right font-medium text-muted-foreground">
              Last live
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hostUserId} className="border-b border-border/60">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  {row.liveNow ? (
                    <span
                      className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-live"
                      aria-label="Live now"
                    />
                  ) : null}
                  <span className="truncate">{row.hostName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  First live {shortDate(row.firstShowAt)}
                </span>
              </td>
              <td className="py-3 pr-4 text-right tabular-nums">{row.hours}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{row.shows}</td>
              <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                {row.avgSessionMinutes}m
              </td>
              <td className="py-3 text-right tabular-nums text-muted-foreground">
                {shortDate(row.lastLiveAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
