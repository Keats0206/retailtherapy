import { normalizeProductImageUrl } from "@/lib/format";
import type { TrailPreviewItem } from "@/lib/shows";
import { cn } from "@/lib/utils";

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
