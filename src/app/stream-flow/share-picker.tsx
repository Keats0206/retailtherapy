"use client";

import { useState } from "react";
import { AppWindow, Check, Monitor, PanelTop, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { MOCK_SITES } from "./mock";
import { BrowserWindow } from "./pieces";

type Surface = "screen" | "window" | "tab";

/**
 * A stand-in for Chrome's "Choose what to share" dialog.
 *
 * The real one can't be skipped or restyled — `getDisplayMedia` always shows
 * it. So the fix isn't hiding it, it's walking the host through it. The whole
 * browser window is the right answer for a hunt that spans sites: share it once
 * and every tab you open afterwards is already on stream.
 */
export function SharePicker({
  query,
  onShare,
  onCancel,
}: {
  query: string;
  onShare: () => void;
  onCancel: () => void;
}) {
  const [surface, setSurface] = useState<Surface>("window");
  const [selected, setSelected] = useState<string | null>("chrome-shopping");

  const canShare = surface === "window" && selected === "chrome-shopping";

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden border border-zinc-300 bg-white text-zinc-900 shadow-2xl">
        <div className="shrink-0 border-b border-zinc-200 px-5 py-4">
          <p className="text-base font-medium">Choose what to share</p>
          <p className="text-sm text-zinc-500">
            frontrow.show wants to share the contents of your screen
          </p>
        </div>

        <div className="flex shrink-0 gap-px bg-zinc-200">
          {(
            [
              { id: "screen", label: "Entire Screen", icon: Monitor },
              { id: "window", label: "Window", icon: AppWindow },
              { id: "tab", label: "Chrome Tab", icon: PanelTop },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSurface(tab.id)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-2 bg-white px-3 py-3 text-sm font-medium",
                surface === tab.id ? "text-zinc-900" : "text-zinc-500 hover:bg-zinc-50",
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
              {tab.id === "window" ? (
                <span className="ml-1 bg-live px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-live-foreground">
                  Pick this
                </span>
              ) : null}
              {surface === tab.id ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-zinc-900" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {surface === "window" ? (
            <>
              <p className="mb-3 text-sm text-zinc-500">
                Share the browser window with your shopping tabs. Every site you
                open in it after this is already on stream.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSelected("chrome-shopping")}
                  className={cn(
                    "relative overflow-hidden border-2 text-left",
                    selected === "chrome-shopping"
                      ? "border-live"
                      : "border-zinc-200 hover:border-zinc-400",
                  )}
                >
                  <div className="pointer-events-none aspect-[4/3] overflow-hidden">
                    <div className="h-[300%] w-[300%] origin-top-left scale-[0.333]">
                      <BrowserWindow activeSiteId={MOCK_SITES[0].id} query={query} compact />
                    </div>
                  </div>
                  <p className="truncate border-t border-zinc-200 px-2 py-1.5 text-xs">
                    Chrome — {MOCK_SITES.length} tabs
                  </p>
                  {selected === "chrome-shopping" ? (
                    <span className="absolute right-0 top-0 flex size-6 items-center justify-center bg-live text-live-foreground">
                      <Check className="size-3.5" />
                    </span>
                  ) : null}
                </button>

                {/* Decoys — picking the right window is the thing hosts got
                    wrong, so the list has to be pickable-wrong. */}
                {["Messages", "Notes — show plan"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelected(label)}
                    className={cn(
                      "border-2 text-left",
                      selected === label ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-400",
                    )}
                  >
                    <div className="aspect-[4/3] bg-zinc-100" />
                    <p className="truncate border-t border-zinc-200 px-2 py-1.5 text-xs">
                      {label}
                    </p>
                  </button>
                ))}
              </div>

              {selected && selected !== "chrome-shopping" ? (
                <Coach
                  title={`${selected} isn’t your shopping`}
                  body="Viewers would watch that window instead of the sites you're browsing. Pick the Chrome window with your shopping tabs."
                  actionLabel="Select Chrome"
                  onFix={() => setSelected("chrome-shopping")}
                />
              ) : null}
            </>
          ) : (
            <Coach
              title={
                surface === "screen"
                  ? "Entire Screen shares everything"
                  : "A tab locks you to one site"
              }
              body={
                surface === "screen"
                  ? "Viewers see your desktop — every notification, message and window that pops up. Most hosts don't mean to do this."
                  : "Chrome Tab shares that one page only. You're hopping between four sites this show, so viewers would be stranded on the first one."
              }
              actionLabel="Use Window instead"
              onFix={() => {
                setSurface("window");
                setSelected("chrome-shopping");
              }}
            />
          )}
        </div>

        <div className="flex shrink-0 gap-px border-t border-zinc-200 bg-zinc-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white py-4 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <Button
            variant="live"
            disabled={!canShare}
            onClick={onShare}
            className="h-auto flex-[2] py-4"
          >
            {canShare ? "Share Chrome window" : "Pick your Chrome window"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A wrong turn, explained in terms of what viewers lose, with the fix attached. */
function Coach({
  title,
  body,
  actionLabel,
  onFix,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onFix: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col items-start gap-4 border-2 border-dashed border-zinc-300 p-5">
      <span className="flex size-10 items-center justify-center bg-amber-100 text-amber-700">
        <TriangleAlert className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-zinc-600">{body}</p>
      </div>
      <Button variant="live" onClick={onFix} className="h-11 px-5">
        {actionLabel}
      </Button>
    </div>
  );
}
