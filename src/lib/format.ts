export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Elapsed show time, e.g. "42 min" / "1h 8m". */
export function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

/**
 * Strips the retailer name retailers tack onto page titles, so the overlay
 * shows a product name rather than an SEO string.
 *
 * Handles both common shapes:
 *   "Cotton Dress | UNIQLO US"              -> "Cotton Dress"
 *   "Air Force 1 '07 Men's Shoes. Nike.com" -> "Air Force 1 '07 Men's Shoes"
 *
 * The retailer suffix must follow a separator (. - | ,) to be removed, so a
 * title that legitimately ends in the brand — "Air Force 1 by Nike" — is left
 * alone.
 */
/**
 * Some retailers (notably SSENSE) return Cloudinary template URLs with a
 * literal `__IMAGE_PARAMS__` segment that 404s in the browser. Channel3 passes
 * these through unchanged; fill in sensible defaults so the image loads.
 */
export function normalizeProductImageUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (url.includes("__IMAGE_PARAMS__")) {
    return url.replaceAll("__IMAGE_PARAMS__", "f_auto,q_auto,w_600");
  }
  return url;
}

export function cleanProductTitle(title: string, retailer?: string): string {
  let out = title.split(/\s+[|–—]\s+/)[0].trim();

  const brand = retailer?.replace(/^www\./, "").split(".")[0];
  if (brand) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out
      .replace(new RegExp(`\\s*[.\\-–—|,]\\s*${escaped}(\\.[a-z]{2,})?\\s*$`, "i"), "")
      .trim();
  }

  return out || title.trim();
}
