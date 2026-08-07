"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AdminMetricsTab } from "@/components/admin-metrics-tab";
import { AdminNav, type AdminTab } from "@/components/admin-nav";
import { AdminOutreachTab } from "@/components/admin-outreach-tab";
import {
  AdminPanelActions,
  AdminPanelTab,
  type PanelShow,
} from "@/components/admin-panel-tab";
import { AdminWaitlistTab } from "@/components/admin-waitlist-tab";
import { buttonVariants } from "@/components/ui/button";
import type { MetricsRange } from "@/lib/metrics-shared";
import { cn } from "@/lib/utils";

const TAB_META: Record<
  AdminTab,
  { title: string; description: string; wide?: boolean }
> = {
  panel: {
    title: "Live show control panel",
    description:
      "Force-end any live show to remove it from browse and send viewers to the recap, or delete a past show to remove its recap for good.",
    wide: false,
  },
  metrics: {
    title: "Creator hours & platform metrics",
    description:
      "Hours creators spent with the studio open, and what came out of them.",
    wide: true,
  },
  waitlist: {
    title: "Creator waitlist",
    description:
      "Applications from /creators and /apply land here. Approve to grant hosting — they'll see Go live across the app. Decline to keep them on the waitlist.",
    wide: true,
  },
  outreach: {
    title: "Creator outreach",
    description:
      "Search TikTok for creators in a niche, pull the ones who publish a contact address in their bio, and write them a first-touch invite. Drafts open in your own Gmail, so you review and send every one by hand.",
    wide: true,
  },
};

function syncTabUrl(tab: AdminTab) {
  const url = new URL(window.location.href);
  if (tab === "panel") {
    url.searchParams.delete("tab");
  } else {
    url.searchParams.set("tab", tab);
  }
  window.history.replaceState(null, "", url);
}

export function AdminShell({
  initialTab,
  initialMetricsRange = "30d",
  adminLabel,
  superAdmin,
  pendingWaitlist: initialPendingWaitlist,
  panelData,
}: {
  initialTab: AdminTab;
  initialMetricsRange?: MetricsRange;
  adminLabel: string;
  superAdmin: boolean;
  pendingWaitlist: number;
  panelData: {
    liveShows: PanelShow[];
    pastShows: PanelShow[];
  };
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<AdminTab>>(
    () => new Set([initialTab]),
  );
  const [liveCount, setLiveCount] = useState(panelData.liveShows.length);
  const [pendingWaitlist] = useState(initialPendingWaitlist);
  const panelRefreshRef = useRef<(() => void) | null>(null);

  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
    syncTabUrl(tab);
  }, []);

  const handlePanelRefresh = useCallback(() => {
    void panelRefreshRef.current?.();
  }, []);

  const meta = TAB_META[activeTab];
  const maxWidth = meta.wide ? "max-w-5xl" : "max-w-3xl";
  const gap = activeTab === "panel" ? "gap-12" : "gap-10";

  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-1 flex-col px-6 py-24",
        maxWidth,
        gap,
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="micro text-muted-foreground">Admin</span>
          <h1 className="text-2xl font-normal leading-snug tracking-tight">
            {meta.title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {activeTab === "panel" ? (
              <>
                Signed in as {adminLabel}
                {superAdmin ? " · super admin" : null}. {meta.description}
              </>
            ) : (
              meta.description
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "panel" ? (
            <Link
              href="/browse"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Browse live shows
            </Link>
          ) : null}
          <AdminNav
            active={activeTab}
            pendingWaitlist={pendingWaitlist}
            onTabChange={handleTabChange}
          />
          {activeTab === "panel" ? (
            <AdminPanelActions
              liveCount={liveCount}
              onCloseAll={handlePanelRefresh}
            />
          ) : null}
        </div>
      </div>

      <div hidden={activeTab !== "panel"} aria-hidden={activeTab !== "panel"}>
        <AdminPanelTab
          initialLiveShows={panelData.liveShows}
          initialPastShows={panelData.pastShows}
          onLiveCountChange={setLiveCount}
          onRegisterRefresh={(refresh) => {
            panelRefreshRef.current = refresh;
          }}
        />
      </div>

      {visitedTabs.has("metrics") ? (
        <div hidden={activeTab !== "metrics"} aria-hidden={activeTab !== "metrics"}>
          <AdminMetricsTab
            initialRange={initialMetricsRange}
            onOpenOutreach={() => handleTabChange("outreach")}
          />
        </div>
      ) : null}

      {visitedTabs.has("waitlist") ? (
        <div hidden={activeTab !== "waitlist"} aria-hidden={activeTab !== "waitlist"}>
          <AdminWaitlistTab />
        </div>
      ) : null}

      {visitedTabs.has("outreach") ? (
        <div
          hidden={activeTab !== "outreach"}
          aria-hidden={activeTab !== "outreach"}
        >
          <AdminOutreachTab />
        </div>
      ) : null}
    </main>
  );
}

export function parseAdminTab(
  value: string | string[] | undefined,
): AdminTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "metrics" || raw === "waitlist" || raw === "outreach") {
    return raw;
  }
  return "panel";
}
