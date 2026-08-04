"use client";

import { usePathname } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { Bookmark } from "lucide-react";

import { useSaved } from "@/components/saved-provider";
import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { slugFromViewerPath } from "@/lib/show-urls";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Adds an item — or a whole show — to the signed-in viewer's board.
 *
 * Two shapes, because the surfaces it lands on differ:
 *   inline   sits in a row of actions next to Shop
 *   overlay  a glass pill in the corner of a product image
 *
 * The overlay form exists specifically for the replay rail and browse cards,
 * where the whole card is already an anchor. It renders as a sibling of that
 * anchor, positioned over it — a button nested inside an <a> is invalid HTML
 * and the anchor swallows the click.
 *
 * Signed out, the same button opens Clerk's modal instead of failing a write,
 * so an attempt to save converts rather than dead-ends.
 */
export function SaveButton({
  product,
  showSlug,
  sourceSlug,
  variant = "inline",
  surface = "default",
  area,
  className,
}: {
  /** The item to save. Omit when saving a whole show. */
  product?: Product;
  /** The show to save. Omit when saving an item. */
  showSlug?: string;
  /**
   * For item saves: the show it was seen in, recorded on the board.
   * Defaults to the slug in the URL, which is where every live and replay
   * save happens — threading this nullable field down through the watch
   * layout, the trail and the product rail would be a lot of plumbing for
   * one line of provenance.
   */
  sourceSlug?: string | null;
  variant?: "inline" | "overlay";
  /** Dark video overlay surfaces inherit white text — outline buttons break. */
  surface?: "default" | "cinema";
  /** Analytics context — "watch", "replay", "browse". */
  area?: string;
  className?: string;
}) {
  const saved = useSaved();
  const pathname = usePathname();

  // No provider (prototype trees) or nothing addressable to save.
  if (!saved || (!product?.id && !showSlug)) return null;

  const source = sourceSlug ?? slugFromViewerPath(pathname);

  const isShow = Boolean(showSlug);
  const isSaved = isShow
    ? saved.savedShowSlugs.has(showSlug!)
    : saved.savedItemIds.has(product!.id);

  const label = isSaved ? "Saved" : "Save";
  const onCinema = surface === "cinema" || variant === "overlay";
  const buttonVariant =
    variant === "overlay"
      ? "cinema"
      : onCinema
        ? isSaved
          ? "cinema"
          : "cinema-ghost"
        : "outline";

  const trigger = (
    <Button
      type="button"
      variant={buttonVariant}
      size={variant === "overlay" ? "icon-xs" : "micro"}
      aria-pressed={isSaved}
      aria-label={isShow ? `${label} show` : label}
      className={cn(
        variant === "inline" && "h-7 gap-1",
        // Overlay stays square like every other surface in the system — the
        // Button base is already rounded-none, so there's nothing to override.
        // Only the fill distinguishes saved from not — the icon and position
        // stay put so the button doesn't jump under the cursor on toggle.
        isSaved && variant === "inline" && surface === "default" && "border-foreground/30",
        className,
      )}
      onClick={(event) => {
        // The overlay sits on top of a card-wide link. Without this the click
        // both saves and navigates away from the page you saved from.
        event.preventDefault();
        event.stopPropagation();

        if (!saved.isSignedIn) return;

        trackEvent(
          isShow
            ? isSaved
              ? AnalyticsEvent.SHOW_UNSAVE
              : AnalyticsEvent.SHOW_SAVE
            : isSaved
              ? AnalyticsEvent.ITEM_UNSAVE
              : AnalyticsEvent.ITEM_SAVE,
          { area: area ?? "unknown" },
        );

        void (isShow
          ? saved.toggleShow(showSlug!)
          : saved.toggleItem(product!, source));
      }}
    >
      <Bookmark className={cn(isSaved && "fill-current")} />
      {variant === "inline" && label}
    </Button>
  );

  if (saved.isSignedIn) return trigger;

  return <SignInButton mode="modal">{trigger}</SignInButton>;
}
