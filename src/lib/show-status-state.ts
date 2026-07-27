"use client";

import { useCallback, useEffect, useRef } from "react";
import { useConnectionState, useDataChannel } from "@livekit/components-react";

/**
 * Lightweight show lifecycle signal over the LiveKit data channel.
 *
 * When the host ends a show, viewers learn immediately instead of waiting for
 * the 5s HTTP poll. HTTP polling remains as a fallback in show-live-viewer.
 */

const TOPIC = "show-status";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type ShowStatusEvent = { t: "ended" };

/** Viewer: react to the host's end-of-show broadcast. */
export function useShowStatusListener({
  onEnded,
}: {
  onEnded: () => void;
}) {
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const handleMessage = useCallback((raw: { payload: Uint8Array }) => {
    try {
      const event = JSON.parse(decoder.decode(raw.payload)) as ShowStatusEvent;
      if (event.t === "ended") onEndedRef.current();
    } catch {
      // Not ours.
    }
  }, []);

  useDataChannel(TOPIC, handleMessage);
}

/** Host: broadcast that the show has ended. */
export function useShowStatusBroadcaster() {
  const connectionState = useConnectionState();
  const connected = connectionState === "connected";
  const sendRef = useRef<
    ((event: ShowStatusEvent) => void) | null
  >(null);

  const { send } = useDataChannel(TOPIC, () => {});

  useEffect(() => {
    if (!connected) {
      sendRef.current = null;
      return;
    }
    sendRef.current = (event: ShowStatusEvent) => {
      send(encoder.encode(JSON.stringify(event)), { reliable: true }).catch(
        () => {},
      );
    };
    return () => {
      sendRef.current = null;
    };
  }, [send, connected]);

  return useCallback(() => {
    sendRef.current?.({ t: "ended" });
  }, []);
}
