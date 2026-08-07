/**
 * Brands offered on the /welcome onboarding step.
 *
 * Hardcoded and curated, the same shape as `partner-brands.ts` — there is no
 * `brands` table yet. Picks are stored as slugs rather than display names
 * precisely so a real table can adopt them later without a data migration, and
 * so renaming a brand here does not orphan everyone who picked it.
 *
 * The list mixes our launch partners with the retailers people already shop,
 * because the question is "who has your taste", not "who pays us".
 */

export type OnboardingBrand = {
  slug: string;
  name: string;
};

export const ONBOARDING_BRANDS: OnboardingBrand[] = [
  { slug: "net-a-porter", name: "Net-a-Porter" },
  { slug: "ssense", name: "SSENSE" },
  { slug: "revolve", name: "Revolve" },
  { slug: "skims", name: "Skims" },
  { slug: "jacquemus", name: "Jacquemus" },
  { slug: "aritzia", name: "Aritzia" },
  { slug: "toteme", name: "Toteme" },
  { slug: "the-row", name: "The Row" },
  { slug: "ganni", name: "Ganni" },
  { slug: "reformation", name: "Reformation" },
  { slug: "djerf-avenue", name: "Djerf Avenue" },
  { slug: "nordstrom", name: "Nordstrom" },
  { slug: "zara", name: "Zara" },
  { slug: "anthropologie", name: "Anthropologie" },
  { slug: "madewell", name: "Madewell" },
  { slug: "free-people", name: "Free People" },
  { slug: "everlane", name: "Everlane" },
  { slug: "asos", name: "ASOS" },
];

const BRAND_SLUGS = new Set(ONBOARDING_BRANDS.map((brand) => brand.slug));

/** Guards the API against slugs that were never on the board. */
export function isKnownBrandSlug(slug: string): boolean {
  return BRAND_SLUGS.has(slug);
}
