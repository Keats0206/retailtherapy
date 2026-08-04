"use client";

import { useTrackToggle } from "@/lib/live";
import { Track, type Room } from "livekit-client";
import { Mic, MicOff, MonitorUp, Square, Video, VideoOff } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStartScreenShare } from "@/hooks/use-start-screen-share";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function HostControlBar({
  room,
  sharing,
  onEndShow,
  pipSupported = false,
  variant = "stage",
}: {
  room?: Room;
  sharing: boolean;
  onEndShow: () => void;
  pipSupported?: boolean;
  variant?: "stage" | "pip" | "pip-overlay";
}) {
  const isOverlay = variant === "pip-overlay";
  const isPip = variant === "pip" || isOverlay;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        !isOverlay && isPip && "gap-1 px-1",
        !isPip && "max-lg:gap-0.5 sm:gap-1.5",
      )}
    >
      <ToggleControl
        room={room}
        source={Track.Source.Microphone}
        label="Microphone"
        on={<Mic />}
        off={<MicOff />}
        variant={variant}
      />
      <ToggleControl
        room={room}
        source={Track.Source.Camera}
        label="Camera"
        on={<Video />}
        off={<VideoOff />}
        variant={variant}
      />
      <ScreenShareControl
        room={room}
        sharing={sharing}
        pipSupported={pipSupported}
        variant={variant}
      />

      {variant !== "stage" ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                aria-label="End show"
                onClick={onEndShow}
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  isOverlay
                    ? "size-8 rounded-full backdrop-blur-sm"
                    : "ml-0.5 size-9 rounded-full",
                )}
              >
                <Square
                  className={
                    isOverlay ? "size-3 fill-current" : "size-4 fill-current"
                  }
                />
              </Button>
            }
          />
          <TooltipContent>End show</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

function ScreenShareControl({
  room,
  sharing,
  pipSupported,
  variant,
}: {
  room?: Room;
  sharing: boolean;
  pipSupported?: boolean;
  variant?: "stage" | "pip" | "pip-overlay";
}) {
  const { buttonProps, startScreenShare, starting } = useStartScreenShare({
    room,
    sharing,
  });
  const isOverlay = variant === "pip-overlay";
  const isPip = variant === "pip";
  const label = sharing ? "Stop sharing" : "Share screen";
  const pipHint =
    !pipSupported && !sharing
      ? "Use Chrome for floating controls while sharing"
      : null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            {...buttonProps}
            onClick={startScreenShare}
            disabled={starting}
            aria-busy={starting}
            aria-label={label}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              isOverlay
                ? "size-8 rounded-full text-white"
                : isPip
                  ? "size-9 rounded-full"
                  : "size-10 rounded-full text-white",
              (isOverlay || !isPip) &&
                (sharing
                  ? "border-white/25 bg-white/10 hover:bg-white/20"
                  : "border-white/30 bg-black/40 text-white/60 hover:bg-black/60"),
              isPip &&
                !isOverlay &&
                (sharing
                  ? "border-foreground/20 bg-foreground/10"
                  : "text-muted-foreground"),
            )}
          >
            <MonitorUp className={isOverlay ? "size-3.5" : isPip ? "size-4" : undefined} />
          </Button>
        }
      />
      <TooltipContent>{pipHint ?? label}</TooltipContent>
    </Tooltip>
  );
}

function ToggleControl({
  room,
  source,
  label,
  on,
  off,
  variant = "stage",
}: {
  room?: Room;
  source:
    | Track.Source.Microphone
    | Track.Source.Camera
    | Track.Source.ScreenShare;
  label: string;
  on: React.ReactNode;
  off: React.ReactNode;
  variant?: "stage" | "pip" | "pip-overlay";
}) {
  const { enabled, buttonProps } = useTrackToggle({ source, room });
  const isOverlay = variant === "pip-overlay";
  const isPip = variant === "pip";
  const event =
    source === Track.Source.Microphone
      ? AnalyticsEvent.HOST_MIC_TOGGLE
      : source === Track.Source.Camera
        ? AnalyticsEvent.HOST_CAMERA_TOGGLE
        : null;

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (event) {
      trackEvent(event, {
        area: "host_studio",
        enabled: !enabled,
      });
    }
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
            aria-label={label}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              isOverlay
                ? "size-8 rounded-full text-white [&_svg]:size-3.5"
                : isPip
                  ? "size-9 rounded-full"
                  : "size-10 rounded-full text-white",
              (isOverlay || !isPip) &&
                (enabled
                  ? "border-white/25 bg-white/10 hover:bg-white/20"
                  : "border-white/30 bg-black/40 text-white/60 hover:bg-black/60"),
              isPip &&
                !isOverlay &&
                (enabled
                  ? "border-foreground/20 bg-foreground/10"
                  : "text-muted-foreground"),
            )}
          >
            {enabled ? on : off}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
