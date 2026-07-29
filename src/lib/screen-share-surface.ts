export type ShareDisplaySurface = "browser" | "window" | "monitor";

export function getShareDisplaySurface(
  track: MediaStreamTrack | null | undefined,
): ShareDisplaySurface | undefined {
  if (!track?.getSettings) return undefined;
  const surface = track.getSettings().displaySurface;
  if (surface === "browser" || surface === "window" || surface === "monitor") {
    return surface;
  }
  return undefined;
}
