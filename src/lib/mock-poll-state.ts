"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 * `PollState` with the wire taken out — the host and the audience are the same
 * browser tab, and the audience is simulated: when a poll opens, mock viewers'
 * votes trickle in over the window so the bars move like a real crowd's.
 *
 * Timer ownership lives here and only here. One timeout closes the poll, the
 * sim ticks apply votes, and `start`/`dismiss` clear everything before
 * touching state — the countdown UI is display-only and never closes.
 */
export function useMockPollState(): PollState {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const start = useCallback(
    (input: PollInput) => {
      clearTimers();
      const next = createPoll(input, Date.now());
      setPoll(next);
      setMyVote(null);

      // Sole owner of the close. The id guard makes a stale timeout harmless.
      timersRef.current.push(
        setTimeout(() => {
          setPoll((p) => applyPollClose(p, next.id));
        }, next.durationMs),
      );

      // Simulated audience. Squared weights skew most runs toward a clear
      // leader while near-ties stay possible; the floor keeps every option
      // alive. ~20–30 ticks of 1–5 votes lands 60–180 total — plausible
      // against MOCK_VIEWER_COUNT without pretending everyone votes.
      const raw = next.options.map(() => 0.1 + Math.random() ** 2);
      const sum = raw.reduce((a, b) => a + b, 0);
      const weights = raw.map((w) => w / sum);

      const ticks = 20 + Math.floor(Math.random() * 12);
      for (let i = 0; i < ticks; i++) {
        // An even trickle with jitter, ending just before the close so the
        // last bar movement isn't cut off mid-transition.
        const spread = 400 + ((next.durationMs - 1200) * i) / ticks;
        const jitter = (Math.random() - 0.5) * 500;
        const at = Math.min(
          Math.max(spread + jitter, 300),
          next.durationMs - 300,
        );
        timersRef.current.push(
          setTimeout(() => {
            const batch = 1 + Math.floor(Math.random() * 5);
            setPoll((p) => {
              let updated = p;
              for (let v = 0; v < batch; v++) {
                updated = applyPollVote(
                  updated,
                  next.id,
                  pickWeighted(next, weights),
                );
              }
              return updated;
            });
          }, at),
        );
      }
    },
    [clearTimers],
  );

  const vote = useCallback(
    (optionId: string) => {
      // One vote per browser; a tap that lands after close must not lock.
      if (myVote || !poll || poll.status !== "open") return;
      setMyVote(optionId);
      setPoll((p) => applyPollVote(p, poll.id, optionId));
    },
    [myVote, poll],
  );

  const dismiss = useCallback(() => {
    clearTimers();
    setPoll((p) => (p ? applyPollDismiss(p, p.id) : p));
  }, [clearTimers]);

  return { poll: selectVisiblePoll(poll), myVote, start, vote, dismiss };
}

function pickWeighted(poll: Poll, weights: number[]): string {
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < poll.options.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return poll.options[i].id;
  }
  return poll.options[poll.options.length - 1].id;
}
