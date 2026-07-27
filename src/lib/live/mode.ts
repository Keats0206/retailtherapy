/**
 * Design mode — run the studio and the watch page against a fake of the
 * LiveKit transport so nothing bills.
 *
 * Screen share, camera and mic are real browser capture; chat, polls, votes,
 * pins, reactions and viewer counts run over a `BroadcastChannel`, so two tabs
 * on the same machine behave like a host and a viewer talking to each other.
 * No room is ever joined, so no LiveKit minutes are consumed.
 *
 * This is a build-time constant on purpose: it is read from a bundler-inlined
 * env var rather than the URL or storage, so its value can never change during
 * a render pass. That is what lets the shims in `./index` branch on it around
 * hook calls without breaking the rules of hooks.
 *
 * Turn it on with `npm run dev:design`.
 */
export const LOCAL_STREAM = process.env.NEXT_PUBLIC_LOCAL_STREAM === "1";

if (process.env.NODE_ENV === "production" && LOCAL_STREAM) {
  throw new Error(
    "NEXT_PUBLIC_LOCAL_STREAM must not be enabled in production builds.",
  );
}

/**
 * Baseline viewer count so the UI is designed against a realistic number
 * instead of a lonely zero. Live viewer tabs are added on top.
 */
export const LOCAL_BASE_VIEWERS = readCount(
  process.env.NEXT_PUBLIC_LOCAL_STREAM_VIEWERS,
  42,
);

function readCount(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return raw && Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
