"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnectionState, useDataChannel } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

import {
  applyPollClose,
  applyPollDismiss,
  applyPollVote,
  createPoll,
  selectVisiblePoll,
  type PollInput,
  type PollState,
} from "@/lib/poll-store";
import type { Poll } from "@/lib/types";

/**
 * Live audience poll state over the LiveKit data channel.
 * Host is authoritative — same pattern as useStreamState.
 */

const TOPIC = "poll";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type PollEvent =
  | { t: "pollHello" }
  | { t: "pollSnapshot"; poll: Poll | null }
  | { t: "pollStart"; input: PollInput; now: number }
  | { t: "pollVote"; pollId: string; optionId: string }
  | { t: "pollClose"; pollId: string }
  | { t: "pollDismiss"; pollId: string };

export function usePollState({ isHost }: { isHost: boolean }): PollState & {
  close: () => void;
  newVote: () => void;
} {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const pollRef = useRef(poll);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const sendRef = useRef<((event: PollEvent) => void) | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(
    (next: Poll) => {
      clearCloseTimer();
      const delay = next.endsAt - Date.now();
      if (delay <= 0) {
        setPoll((p) => applyPollClose(p, next.id));
        return;
      }
      closeTimerRef.current = setTimeout(() => {
        setPoll((p) => applyPollClose(p, next.id));
        if (isHost) {
          sendRef.current?.({ t: "pollClose", pollId: next.id });
        }
      }, delay);
    },
    [clearCloseTimer, isHost],
  );

  const handleMessage = useCallback(
    (raw: { payload: Uint8Array }) => {
      let event: PollEvent;
      try {
        event = JSON.parse(decoder.decode(raw.payload)) as PollEvent;
      } catch {
        return;
      }

      if (isHost) {
        if (event.t === "pollHello") {
          sendRef.current?.({ t: "pollSnapshot", poll: pollRef.current });
        } else if (event.t === "pollVote") {
          setPoll((p) => applyPollVote(p, event.pollId, event.optionId));
        }
        return;
      }

      if (event.t === "pollSnapshot") {
        setPoll(event.poll);
        setMyVote(null);
      } else if (event.t === "pollStart") {
        const next = createPoll(event.input, event.now);
        setPoll(next);
        setMyVote(null);
      } else if (event.t === "pollVote") {
        setPoll((p) => applyPollVote(p, event.pollId, event.optionId));
      } else if (event.t === "pollClose") {
        setPoll((p) => applyPollClose(p, event.pollId));
      } else if (event.t === "pollDismiss") {
        setPoll((p) => applyPollDismiss(p, event.pollId));
      }
    },
    [isHost],
  );

  const { send } = useDataChannel(TOPIC, handleMessage);
  const connectionState = useConnectionState();
  const connected = connectionState === ConnectionState.Connected;

  useEffect(() => {
    if (!connected) {
      sendRef.current = null;
      return;
    }
    sendRef.current = (event: PollEvent) => {
      send(encoder.encode(JSON.stringify(event)), { reliable: true }).catch(
        () => {},
      );
    };
    return () => {
      sendRef.current = null;
    };
  }, [send, connected]);

  useEffect(() => {
    if (!isHost || !connected) return;
    sendRef.current?.({ t: "pollSnapshot", poll });
  }, [isHost, connected, poll]);

  useEffect(() => {
    if (isHost || !connected) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      sendRef.current?.({ t: "pollHello" });
      if (attempts >= 3) clearInterval(timer);
    }, 700);
    return () => clearInterval(timer);
  }, [isHost, connected]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  const start = useCallback(
    (input: PollInput) => {
      clearCloseTimer();
      const now = Date.now();
      const next = createPoll(input, now);
      setPoll(next);
      setMyVote(null);
      scheduleClose(next);
    },
    [clearCloseTimer, scheduleClose],
  );

  const vote = useCallback(
    (optionId: string) => {
      if (myVote || !poll || poll.status !== "open") return;
      if (!isHost && !connected) return;

      setMyVote(optionId);
      setPoll((p) => applyPollVote(p, poll.id, optionId));

      if (!isHost) {
        sendRef.current?.({ t: "pollVote", pollId: poll.id, optionId });
      }
    },
    [connected, isHost, myVote, poll],
  );

  const dismiss = useCallback(() => {
    clearCloseTimer();
    if (!poll) return;
    setPoll((p) => (p ? applyPollDismiss(p, p.id) : p));
    setMyVote(null);
    if (isHost) {
      sendRef.current?.({ t: "pollDismiss", pollId: poll.id });
    }
  }, [clearCloseTimer, isHost, poll]);

  const close = useCallback(() => {
    clearCloseTimer();
    if (!poll) return;
    setPoll((p) => (p ? applyPollClose(p, p.id) : p));
    if (isHost) {
      sendRef.current?.({ t: "pollClose", pollId: poll.id });
    }
  }, [clearCloseTimer, isHost, poll]);

  const newVote = useCallback(() => {
    dismiss();
  }, [dismiss]);

  return {
    poll: selectVisiblePoll(poll),
    myVote,
    start,
    vote,
    dismiss,
    close,
    newVote,
  };
}
