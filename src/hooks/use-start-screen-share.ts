"use client";

import { useTrackToggle } from "@livekit/components-react";
import { Track, type Room } from "livekit-client";
import { useCallback } from "react";

import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

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

  const startScreenShare = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!sharing && pipSupported && onBeforeShare) {
        try {
          await onBeforeShare();
        } catch {
          // Fall back to in-page studio if PiP fails.
        }
      }
      if (!sharing) {
        trackEvent(AnalyticsEvent.HOST_SCREEN_SHARE, {
          area: "host_studio",
          action: "start",
        });
      }
      buttonProps.onClick?.(e);
    },
    [buttonProps, onBeforeShare, pipSupported, sharing],
  );

  return { buttonProps, startScreenShare };
}
