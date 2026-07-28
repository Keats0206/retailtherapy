/**
 * Canvas-generated video for design mode.
 *
 * A viewer tab has no way to receive the host tab's screen share — a
 * `MediaStream` can't cross a `BroadcastChannel` — so the watch page renders
 * this instead. It is deliberately obvious that it isn't a real feed: the point
 * is to have moving content of the right shape and aspect ratio in the stage
 * while laying out everything around it.
 */

export type SyntheticVideo = {
  track: MediaStreamTrack;
  stop: () => void;
};

export function createSyntheticVideo({
  label,
  width = 1280,
  height = 720,
  hue = 74,
}: {
  label: string;
  width?: number;
  height?: number;
  /** Base hue in degrees. 74 is roughly the app's chartreuse. */
  hue?: number;
}): SyntheticVideo {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const started = performance.now();
  let frame = 0;

  function draw() {
    if (!ctx) return;
    const t = (performance.now() - started) / 1000;

    const backdrop = ctx.createLinearGradient(0, 0, width, height);
    backdrop.addColorStop(0, `hsl(${hue} 12% 9%)`);
    backdrop.addColorStop(1, `hsl(${hue + 30} 14% 14%)`);
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, width, height);

    // A drifting blob, so the feed visibly moves and you can tell at a glance
    // that video is flowing rather than frozen.
    const cx = width / 2 + Math.sin(t / 3) * width * 0.18;
    const cy = height / 2 + Math.cos(t / 4) * height * 0.14;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, height * 0.55);
    glow.addColorStop(0, `hsl(${hue} 90% 60% / 0.32)`);
    glow.addColorStop(1, `hsl(${hue} 90% 60% / 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const scale = height / 720;
    ctx.textAlign = "center";

    ctx.fillStyle = `hsl(${hue} 80% 72%)`;
    ctx.font = `600 ${Math.round(20 * scale)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText("DESIGN MODE — SYNTHETIC FEED", cx, cy - 40 * scale);

    ctx.fillStyle = "hsl(0 0% 100% / 0.92)";
    ctx.font = `500 ${Math.round(44 * scale)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(label, cx, cy + 12 * scale);

    ctx.fillStyle = "hsl(0 0% 100% / 0.45)";
    ctx.font = `400 ${Math.round(22 * scale)}px ui-monospace, monospace`;
    ctx.fillText(formatClock(t), cx, cy + 56 * scale);

    frame = requestAnimationFrame(draw);
  }

  frame = requestAnimationFrame(draw);

  // A captured canvas only emits frames while something draws to it, so the
  // rAF loop above is what keeps the track live.
  const stream = canvas.captureStream(30);
  const track = stream.getVideoTracks()[0];

  return {
    track,
    stop() {
      cancelAnimationFrame(frame);
      track.stop();
    },
  };
}

function formatClock(seconds: number): string {
  const total = Math.floor(seconds);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
