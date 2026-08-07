"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WaitlistCounts, WaitlistSignupView } from "@/lib/host-approvals";
import type { WaitlistStatus } from "@/lib/db/schema";
import { readResponseJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";

const FILTERS: Array<WaitlistStatus | "all"> = [
  "pending",
  "approved",
  "declined",
  "all",
];

const FILTER_LABELS: Record<WaitlistStatus | "all", string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  all: "All",
};

const STATUS_STYLES: Record<WaitlistStatus, string> = {
  pending: "bg-live/15 text-live",
  approved: "bg-primary/10 text-primary",
  declined: "bg-muted text-muted-foreground",
};

function formatAppliedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function socialSummary(
  socials: WaitlistSignupView["socials"],
): string | null {
  if (!socials) return null;
  const parts = [
    socials.instagram ? `@${socials.instagram}` : null,
    socials.tiktok ? `@${socials.tiktok}` : null,
    socials.youtube ? socials.youtube : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function AdminWaitlistClient({
  initialSignups,
  initialCounts,
}: {
  initialSignups: WaitlistSignupView[];
  initialCounts: WaitlistCounts;
}) {
  const [signups, setSignups] = useState(initialSignups);
  const [counts, setCounts] = useState(initialCounts);
  const [filter, setFilter] = useState<WaitlistStatus | "all">("pending");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "all"
        ? signups
        : signups.filter((signup) => signup.status === filter),
    [signups, filter],
  );

  function setBusyFor(id: string, on: boolean) {
    setBusy((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function applyUpdate(updated: WaitlistSignupView) {
    setSignups((current) => {
      const next = current.map((entry) =>
        entry.id === updated.id ? updated : entry,
      );
      const tally: WaitlistCounts = {
        pending: 0,
        approved: 0,
        declined: 0,
        all: next.length,
      };
      for (const entry of next) tally[entry.status] += 1;
      setCounts(tally);
      return next;
    });
  }

  async function review(id: string, action: "approve" | "decline") {
    setBusyFor(id, true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/waitlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        let payload: { error?: string } = {};
        try {
          payload = await readResponseJson<{ error?: string }>(response);
        } catch {
          // ignore
        }
        throw new Error(payload.error ?? "Couldn't update this application.");
      }

      const updated = await readResponseJson<WaitlistSignupView>(response);
      applyUpdate(updated);
      setMessage(
        action === "approve"
          ? `${updated.email} can now host.`
          : `${updated.email} was declined.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyFor(id, false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {FILTER_LABELS[value]}
            <span className="tabular-nums text-muted-foreground">
              {counts[value]}
            </span>
          </Button>
        ))}
      </div>

      {message ? (
        <p className="text-sm text-primary">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {filter === "all" ? "" : `${FILTER_LABELS[filter].toLowerCase()} `}
          applications yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((signup) => {
            const socials = socialSummary(signup.socials);
            const isPending = signup.status === "pending";
            const working = busy.has(signup.id);

            return (
              <Card
                key={signup.id}
                className="py-0 ring-foreground/8 transition-colors hover:ring-foreground/15"
              >
                <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-normal">
                        {signup.name?.trim() || signup.email}
                      </span>
                      <Badge
                        size="micro"
                        className={cn(STATUS_STYLES[signup.status])}
                      >
                        {FILTER_LABELS[signup.status]}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {signup.email}
                      {signup.handle ? ` · ${signup.handle}` : null}
                    </p>
                    {socials ? (
                      <p className="text-sm text-muted-foreground">{socials}</p>
                    ) : null}
                    {signup.pitch ? (
                      <p className="text-sm leading-relaxed text-foreground">
                        {signup.pitch}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Applied {formatAppliedAt(signup.createdAt)}
                      {signup.userId ? ` · Clerk ${signup.userId}` : null}
                    </p>
                  </div>

                  {isPending ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        disabled={working}
                        onClick={() => review(signup.id, "approve")}
                      >
                        {working ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Check data-icon="inline-start" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={working}
                        onClick={() => review(signup.id, "decline")}
                      >
                        <X data-icon="inline-start" />
                        Decline
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
