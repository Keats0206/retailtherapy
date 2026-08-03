import { LANDING_HOST_IMAGE } from "@/lib/landing-demo-data";
import { outfitProducts, PORTER_OUTFITS } from "@/lib/landing-porter-outfits";
import { cn } from "@/lib/utils";

/**
 * The look on the host's screen. Porter packshots carry no price of their own —
 * this is an illustration of a storefront, so the numbers live here with it.
 */
const SHELF = [
  ...outfitProducts(PORTER_OUTFITS[3]!),
  ...outfitProducts(PORTER_OUTFITS[2]!),
].map((product, i) => ({
  ...product,
  price: [290, 465, 1290, 1850, 380, 990][i]!,
}));

/**
 * The illustration in the home page masthead: what a viewer actually sees when
 * they join a room — a host's screen share of a store, their face in the corner
 * bubble, and the product they just pinned.
 *
 * The page copy alone never landed the "someone is *on camera* shopping right
 * now" part, so this is deliberately literal: real product imagery from the
 * demo catalogue behind a mock browser chrome, with the camera bubble sitting
 * over it exactly where it sits on a live show. Nothing here is interactive —
 * it is a picture, so it is `aria-hidden` and carries no links.
 */
export function LivePreviewMock({ className }: { className?: string }) {
  // Two outfits off the shelf; the second tile is the "pinned" pick.
  const products = SHELF;

  return (
    <div
      aria-hidden
      className={cn(
        // No fixed aspect: with two rows of tiles the grid sets the height, so
        // nothing gets clipped when the captions wrap.
        "relative w-full select-none overflow-hidden bg-card ring-1 ring-border",
        className,
      )}
    >
      {/* Mock browser chrome — the host is on a store, not in our app. */}
      <div className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2">
        <span className="flex gap-1.5">
          <span className="size-2 bg-muted-foreground/30" />
          <span className="size-2 bg-muted-foreground/30" />
          <span className="size-2 bg-muted-foreground/30" />
        </span>
        <span className="ml-1 truncate border border-border bg-background px-2.5 py-1 text-[10px] leading-none text-muted-foreground">
          shop.net-a-porter.com
        </span>
      </div>

      {/* Two rows of three — a store grid, not a lineup. */}
      <div className="grid grid-cols-3 gap-2 p-2.5 sm:gap-2.5 sm:p-3">
        {products.map((product, i) => (
          <div key={product.id} className="flex flex-col gap-1">
            <div
              className={cn(
                // Packshots are cut-outs, so they sit *inside* the tile rather
                // than filling it — contain, on the store's own white.
                "relative aspect-square overflow-hidden bg-white",
                i === 1 ? "ring-2 ring-foreground" : "ring-1 ring-border",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain p-2"
              />
              {i === 1 ? (
                <span className="micro absolute inset-x-0 bottom-0 bg-foreground px-1.5 py-1 text-center text-[9px] leading-none text-background">
                  Pinned
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5 px-0.5">
              <span className="truncate text-[10px] leading-none text-foreground">
                {product.name}
              </span>
              <span className="text-[10px] leading-none text-muted-foreground">
                ${product.price}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Live badge and audience — top-left, as on a real show. */}
      <div className="absolute left-3 top-11 flex items-center gap-1.5 sm:top-12">
        <span className="micro inline-flex items-center gap-1.5 bg-live px-2 py-1 text-[10px] leading-none text-live-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/70" />
          Live
        </span>
        <span className="micro bg-foreground px-2 py-1 text-[10px] leading-none text-background">
          214 watching
        </span>
      </div>

      {/* The point of the whole illustration: a person, on camera, shopping. */}
      <div className="absolute bottom-3 right-3 flex flex-col items-center gap-1.5">
        <span className="relative block size-20 overflow-hidden rounded-full bg-black ring-2 ring-live sm:size-24">
          {/* Drawn portrait sits underneath as the fallback, so the bubble still
              reads as a person if the photo is missing or still loading. */}
          <HostPortrait />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LANDING_HOST_IMAGE}
            alt=""
            loading="lazy"
            decoding="async"
            // Same portrait source as the stage: bias the crop upward so the
            // face lands inside the square bubble instead of being cut off.
            className="absolute inset-0 h-full w-full object-cover object-[50%_30%]"
          />
        </span>
        <span className="micro bg-foreground px-2 py-1 text-[10px] leading-none text-background">
          Maya
        </span>
      </div>
    </div>
  );
}

/**
 * A drawn stand-in for the host's webcam. We have no photography and no real
 * feed to show on a static page, so this is framed like a cropped camera
 * bubble — head and shoulders, lit from the screen.
 */
function HostPortrait() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full"
      role="presentation"
    >
      <defs>
        <radialGradient id="hp-screen" cx="0.5" cy="0.9" r="0.8">
          <stop offset="0%" stopColor="#c8f542" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#c8f542" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="#241f1b" />
      <rect width="100" height="100" fill="url(#hp-screen)" />
      {/* shoulders */}
      <path d="M18 100c2-22 15-32 32-32s30 10 32 32z" fill="#3d3832" />
      {/* neck + head */}
      <rect x="42" y="52" width="16" height="18" rx="7" fill="#d4c4b0" />
      <circle cx="50" cy="40" r="21" fill="#e8dfd4" />
      {/* hair */}
      <path
        d="M29 40a21 21 0 0 1 42 0c0-14-8-22-21-22S29 26 29 40z"
        fill="#2f2a26"
      />
    </svg>
  );
}
