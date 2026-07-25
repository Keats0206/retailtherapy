import { normalizeProductImageUrl } from "@/lib/format";
import type { TrailPreviewItem } from "@/lib/shows";
import { cn } from "@/lib/utils";

export function ShowTrailPreview({
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
    .filter((item) => item.imageUrl);

  if (previews.length === 0) return null;

  if (previews.length === 1) {
    return (
      <div
        className={cn(
          "size-11 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/8",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previews[0].imageUrl!}
          alt={previews[0].name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid size-11 shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/8",
        className,
      )}
    >
      {previews.slice(0, 4).map((item, index) => {
        const isLast = index === 3 && extraCount > 0;

        return (
          <div key={`${item.name}-${index}`} className="relative bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl!}
              alt={item.name}
              className="h-full w-full object-cover"
            />
            {isLast ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[10px] font-medium text-white">
                +{extraCount}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
