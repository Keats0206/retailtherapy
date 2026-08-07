"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { AdminWaitlistClient } from "@/components/admin-waitlist-client";
import type { WaitlistCounts, WaitlistSignupView } from "@/lib/host-approvals";
import { readResponseJson } from "@/lib/fetch-json";

export function AdminWaitlistTab() {
  const [signups, setSignups] = useState<WaitlistSignupView[] | null>(null);
  const [counts, setCounts] = useState<WaitlistCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/waitlist");
        const data = await readResponseJson<{
          signups: WaitlistSignupView[];
          counts: WaitlistCounts;
          error?: string;
        }>(res);
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load waitlist");
        }
        if (!cancelled) {
          setSignups(data.signups);
          setCounts(data.counts);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="py-12 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!signups || !counts) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-sm">Loading waitlist…</p>
      </div>
    );
  }

  return <AdminWaitlistClient initialSignups={signups} initialCounts={counts} />;
}
