"use client";

import { useTrackToggle } from "@/lib/live";
import { useMaybeLocalRoom } from "@/lib/live/local-room";
import { LOCAL_STREAM } from "@/lib/live/mode";
import { Track, type Room } from "livekit-client";
import { useCallback, useEffect, useState } from "react";

import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

const WINDOW_SHARE_OPTIONS = {
  video: { displaySurface: "window" as const },
};

function shareErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Screen share permission was denied. Check browser settings and try again.";
    }
    if (err.name === "AbortError") {
      return "Screen share was cancelled. Click Share screen to try again.";
    }
  }
  return "Could not start screen share. Try again and pick Window in Chrome.";
}

export function useStartScreenShare({
  room,
  sharing,
  onBeforeShare,
  pipSupported = false,
}: {
  room?: Room;
  sharing: boolean;
  onBeforeShare?: () => void | Promise<void>;
  pipSupported?: boolean;
}) {
  const { buttonProps } = useTrackToggle({
    source: Track.Source.ScreenShare,
    room,
  });
  const localRoom = useMaybeLocalRoom();
  const [starting, setStarting] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (sharing) setStarting(false);
  }, [sharing]);

  const clearShareError = useCallback(() => setShareError(null), []);

  const startScreenShare = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (sharing) {
        buttonProps.onClick?.(e);
        return;
      }

      setShareError(null);
      setStarting(true);

      if (pipSupported && onBeforeShare) {
        try {
          await onBeforeShare();
        } catch {
          // Fall back to in-page studio if PiP fails.
        }
      }

      trackEvent(AnalyticsEvent.HOST_SCREEN_SHARE, {
        area: "host_studio",
        action: "start",
      });

      try {
        if (LOCAL_STREAM && localRoom) {
          await localRoom.toggleSource(Track.Source.ScreenShare);
        } else if (room?.localParticipant?.setScreenShareEnabled) {
          await room.localParticipant.setScreenShareEnabled(
            true,
            WINDOW_SHARE_OPTIONS,
          );
        } else {
          buttonProps.onClick?.(e);
        }
      } catch (err) {
        setShareError(shareErrorMessage(err));
        setStarting(false);
      }
    },
    [buttonProps, localRoom, onBeforeShare, pipSupported, room, sharing],
  );

  return {
    buttonProps,
    startScreenShare,
    starting: starting && !sharing,
    shareError: sharing ? null : shareError,
    clearShareError,
  };
}
