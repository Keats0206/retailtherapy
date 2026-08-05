/** Public viewer/watch URL for a show. */
export function viewerShowPath(slug: string): string {
  return `/show/${slug}`;
}

/** Pre-show lobby for a scheduled show that has not started yet. */
export function waitroomShowPath(slug: string): string {
  return `/waitroom/${slug}`;
}

/** Auth-gated host studio URL for a show. */
export function hostShowPath(slug: string): string {
  return `/host/${slug}`;
}

/** Legacy short viewer path — kept for redirects and saved-link parsing. */
export function legacyViewerShowPath(slug: string): string {
  return `/s/${slug}`;
}

/** Extract slug from /show/<slug> or legacy /s/<slug>. */
export function slugFromViewerPath(pathname: string | null): string | null {
  const match = pathname?.match(/^\/(?:show|s)\/([^/]+)/);
  return match?.[1] ?? null;
}
