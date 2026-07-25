"use client";

import { useTrackToggle } from "@livekit/components-react";
import { Track, type Room } from "livekit-client";
import { LogOut, Mic, MicOff, MonitorUp } from "lucide-react";

import { PipStoreSuggestions } from "@/components/pip-store-suggestions";
import { ShareShowLinkButton } from "@/components/share-show-link-button";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStartScreenShare } from "@/hooks/use-start-screen-share";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function ShareScreenGate({
  slug,
  room,
  sharing,
  onEndShow,
  onBeforeShare,
  pipSupported = false,
}: {
  slug: string;
  room: Room;
  sharing: boolean;
  onEndShow: () => void;
  onBeforeShare?: () => void | Promise<void>;
  pipSupported?: boolean;
}) {
  const { startScreenShare } = useStartScreenShare({
    room,
    sharing,
    onBeforeShare,
    pipSupported,
  });

  const pipHint =
    !pipSupported && !sharing
      ? "Use Chrome for floating controls while sharing"
      : null;

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex w-full max-w-lg flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-3 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
          Live
        </span>
        <h1 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">
          Share your screen to go live for viewers
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Viewers see whatever you share. Choose a{" "}
          <span className="font-medium text-foreground">browser window</span> so
          you can hop between tabs while shopping, or share your{" "}
          <span className="font-medium text-foreground">entire screen</span>.
        </p>
      </div>

      <ol className="flex w-full max-w-md flex-col gap-2 text-left text-sm text-muted-foreground">
        <li className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
            1
          </span>
          <span>Click Share screen and pick a window or screen</span>
        </li>
        <li className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
            2
          </span>
          <span>
            Open a live shopping window (chartreuse border) and share that
            window in the picker
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
            3
          </span>
          <span>Paste product links in the floating studio</span>
        </li>
      </ol>

      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <Button
          type="button"
          onClick={startScreenShare}
          className="h-14 w-full rounded-full bg-live text-lg font-medium text-live-foreground hover:bg-live/90 sm:h-16"
        >
          <MonitorUp className="size-5" />
          Share screen
        </Button>
        {pipHint ? (
          <p className="micro text-center text-muted-foreground">{pipHint}</p>
        ) : null}
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <ShareShowLinkButton slug={slug} showPath className="w-full" />

        <PipStoreSuggestions className="w-full" />

        <div className="flex items-center gap-2">
          <MicToggle room={room} />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onEndShow}
                  aria-label="End show"
                  className="size-10 rounded-full border-live/50 text-live hover:bg-live hover:text-live-foreground"
                >
                  <LogOut />
                </Button>
              }
            />
            <TooltipContent>End show</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </main>
  );
}

function MicToggle({ room }: { room: Room }) {
  const { enabled, buttonProps } = useTrackToggle({
    source: Track.Source.Microphone,
    room,
  });

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    trackEvent(AnalyticsEvent.HOST_MIC_TOGGLE, {
      area: "host_studio",
      enabled: !enabled,
    });
    buttonProps.onClick?.(e);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            {...buttonProps}
            onClick={handleClick}
            aria-label={enabled ? "Mute microphone" : "Unmute microphone"}
            className={cn(
              "size-10 rounded-full",
              enabled
                ? "border-foreground/20 bg-foreground/10"
                : "text-muted-foreground",
            )}
          >
            {enabled ? <Mic /> : <MicOff />}
          </Button>
        }
      />
      <TooltipContent>{enabled ? "Mic on" : "Mic off"}</TooltipContent>
    </Tooltip>
  );
}
