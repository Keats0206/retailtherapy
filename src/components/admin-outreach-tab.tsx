"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { CreatorOutreachClient } from "@/components/creator-outreach-client";
import { readResponseJson } from "@/lib/fetch-json";
import type {
  OutreachCounts,
  ProspectView,
} from "@/lib/outreach-status";

export function AdminOutreachTab() {
  const [prospects, setProspects] = useState<ProspectView[] | null>(null);
  const [counts, setCounts] = useState<OutreachCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/creator-outreach");
        const data = await readResponseJson<{
          prospects: ProspectView[];
          counts: OutreachCounts;
          error?: string;
        }>(res);
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load outreach");
        }
        if (!cancelled) {
          setProspects(data.prospects);
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

  if (!prospects || !counts) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-sm">Loading creator outreach…</p>
      </div>
    );
  }

  return (
    <CreatorOutreachClient
      initialProspects={prospects}
      initialCounts={counts}
    />
  );
}
