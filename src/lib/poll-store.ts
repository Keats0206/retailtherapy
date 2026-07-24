/**
 * A live audience poll and the pure transitions over it.
 *
 * Deliberately transport-free, like `stream-store.ts`: no LiveKit, no React.
 * `useMockPollState` drives these transitions from local state for /prototype;
 * a future `usePollState` would drive the same ones over the room's data
 * channel. Every reducer is id-guarded and idempotent so duplicate or
 * out-of-order delivery is a no-op rather than a corruption.
 */

import type { Poll, PollOption } from "@/lib/types";

export const POLL_DURATION_MS = 10_000;

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 4;

export interface PollInput {
  question: string;
  options: { label: string; emoji: string }[];
  durationMs?: number;
}

export function createPoll(input: PollInput, now: number): Poll {
  const durationMs = input.durationMs ?? POLL_DURATION_MS;
  const options: PollOption[] = input.options
    .slice(0, MAX_POLL_OPTIONS)
    .map((option, i) => ({ id: `opt-${i}`, ...option, count: 0 }));
  if (options.length < MIN_POLL_OPTIONS) {
    throw new Error(`A poll needs at least ${MIN_POLL_OPTIONS} options`);
  }
  return {
    id: `poll-${now}`,
    question: input.question,
    options,
    status: "open",
    startedAt: now,
    endsAt: now + durationMs,
    durationMs,
  };
}

export function applyPollVote(
  poll: Poll | null,
  pollId: string,
  optionId: string,
): Poll | null {
  if (!poll || poll.id !== pollId || poll.status !== "open") return poll;
  if (!poll.options.some((o) => o.id === optionId)) return poll;
  return {
    ...poll,
    options: poll.options.map((o) =>
      o.id === optionId ? { ...o, count: o.count + 1 } : o,
    ),
  };
}

export function applyPollClose(poll: Poll | null, pollId: string): Poll | null {
  if (!poll || poll.id !== pollId || poll.status !== "open") return poll;
  return { ...poll, status: "closed" };
}

export function applyPollDismiss(
  poll: Poll | null,
  pollId: string,
): Poll | null {
  if (!poll || poll.id !== pollId || poll.status === "dismissed") return poll;
  return { ...poll, status: "dismissed" };
}

/** Dismissed polls stay in state but render nowhere. */
export function selectVisiblePoll(poll: Poll | null): Poll | null {
  return poll && poll.status !== "dismissed" ? poll : null;
}

export function selectPollTotal(poll: Poll): number {
  return poll.options.reduce((sum, o) => sum + o.count, 0);
}

/** Percent per option id. An untouched poll reads as an even split — no NaN. */
export function selectPollShares(poll: Poll): Record<string, number> {
  const total = selectPollTotal(poll);
  const shares: Record<string, number> = {};
  for (const o of poll.options) {
    shares[o.id] =
      total === 0
        ? Math.round(100 / poll.options.length)
        : Math.round((o.count / total) * 100);
  }
  return shares;
}

/** Highest-count option (first wins a tie), or null before any votes. */
export function selectPollLeader(poll: Poll): string | null {
  if (selectPollTotal(poll) === 0) return null;
  let leader = poll.options[0];
  for (const o of poll.options) {
    if (o.count > leader.count) leader = o;
  }
  return leader.id;
}

const EMOJI_KEYWORDS: [RegExp, string][] = [
  [/shoe|sneaker|heel|boot/i, "👟"],
  [/sunglass|shade/i, "🕶️"],
  [/bag|purse|tote/i, "👜"],
  [/hat|cap|beanie/i, "🧢"],
  [/dress|skirt/i, "👗"],
  [/jacket|coat|hoodie/i, "🧥"],
  [/ring|jewel|necklace/i, "💍"],
  [/lip|makeup|beauty/i, "💄"],
  [/^ya+y|^yes/i, "🙌"],
  [/^na+y|^no/i, "👎"],
];

const EMOJI_POOL = ["🛍️", "✨", "🔥", "💯"];

/** Best-effort emoji for a custom option: keyword match, then a rotating pool. */
export function emojiFor(label: string, index: number): string {
  for (const [pattern, emoji] of EMOJI_KEYWORDS) {
    if (pattern.test(label)) return emoji;
  }
  return EMOJI_POOL[index % EMOJI_POOL.length];
}

/**
 * What the poll hook hands the UI — same doctrine as `StreamState`: the
 * overlay and composer render identically whether the poll came off the wire
 * or out of the prototype harness.
 */
export interface PollState {
  /** Already filtered through `selectVisiblePoll` — null means no overlay. */
  poll: Poll | null;
  /** Option id this browser chose in the current poll, to lock its buttons. */
  myVote: string | null;
  start: (input: PollInput) => void;
  vote: (optionId: string) => void;
  dismiss: () => void;
}
