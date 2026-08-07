import { normalizeProductImageUrl } from "@/lib/format";
import type { TrailPreviewItem } from "@/lib/shows";
import { cn } from "@/lib/utils";

/** Single 16:9 cover — the stream preview, not the product mosaic. */
export function ShowCover({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const imageUrl = normalizeProductImageUrl(src) ?? src;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "aspect-video w-full bg-muted object-cover transition-transform duration-300 group-hover:scale-[1.02]",
        className,
      )}
    />
  );
}

/** Small product chips under a show card — the shoppable trail at a glance. */
export function TrailPreviewStrip({
  items,
  extraCount = 0,
  className,
}: {
  items: TrailPreviewItem[];
  extraCount?: number;
  className?: string;
}) {
  const previews = items
    .map((item) => ({
      ...item,
      imageUrl: normalizeProductImageUrl(item.imageUrl),
    }))
    .filter((item): item is TrailPreviewItem & { imageUrl: string } =>
      Boolean(item.imageUrl),
    );

  if (previews.length === 0 && extraCount === 0) return null;

  const visible = previews.slice(0, 5);
  const hidden = extraCount + Math.max(0, previews.length - visible.length);

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label="Items in this show"
    >
      {visible.map((item, i) => (
        <li
          key={`${item.name}-${i}`}
          className="size-9 shrink-0 overflow-hidden bg-muted ring-1 ring-border/60"
          title={item.name}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        </li>
      ))}
      {hidden > 0 ? (
        <li className="micro flex h-9 min-w-9 items-center justify-center bg-muted px-2 tabular-nums text-muted-foreground ring-1 ring-border/60">
          +{hidden}
        </li>
      ) : null}
    </ul>
  );
}

/**
 * Board-style cover for a show: the products it featured, laid out as a
 * mosaic. Falls back through 2-up and 1-up to the show's own thumbnail, so a
 * show with no pinned products still gets a cover instead of an empty tile.
 */
export function ShowMosaic({
  items,
  extraCount = 0,
  fallbackUrl,
  className,
}: {
  items: TrailPreviewItem[];
  extraCount?: number;
  fallbackUrl: string;
  className?: string;
}) {
  const previews = items
    .map((item) => ({ ...item, imageUrl: normalizeProductImageUrl(item.imageUrl) }))
    .filter((item): item is TrailPreviewItem & { imageUrl: string } =>
      Boolean(item.imageUrl),
    );

  const frame = cn(
    "relative aspect-square w-full overflow-hidden bg-muted",
    className,
  );

  if (previews.length === 0) {
    return (
      <div className={frame}>
        <Tile src={fallbackUrl} alt="" />
      </div>
    );
  }

  if (previews.length === 1) {
    return (
      <div className={frame}>
        <Tile src={previews[0].imageUrl} alt={previews[0].name} />
      </div>
    );
  }

  if (previews.length === 2) {
    return (
      <div className={cn(frame, "grid grid-cols-2 gap-1")}>
        {previews.map((item, i) => (
          <Tile key={`${item.name}-${i}`} src={item.imageUrl} alt={item.name} />
        ))}
      </div>
    );
  }

  // 3+: one hero on the left, the rest stacked down the right.
  const [hero, ...rest] = previews;
  const side = rest.slice(0, 2);

  return (
    <div className={cn(frame, "grid grid-cols-[1.6fr_1fr] gap-1")}>
      <Tile src={hero.imageUrl} alt={hero.name} />
      <div className="grid grid-rows-2 gap-1">
        {side.map((item, i) => {
          const isLast = i === side.length - 1;
          const hidden = extraCount + (previews.length - 1 - side.length);
          return (
            <div key={`${item.name}-${i}`} className="relative overflow-hidden">
              <Tile src={item.imageUrl} alt={item.name} />
              {isLast && hidden > 0 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                  +{hidden}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ src, alt }: { src: string; alt: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-full w-full bg-muted object-cover"
    />
  );
}

/** Monogram avatar — we have host names but no profile images. */
export function HostAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-xs font-medium text-foreground ring-2 ring-card",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}
