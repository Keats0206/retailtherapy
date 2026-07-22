/**
 * Fetch real retailer product images via Channel3 for the landing page mockup.
 * Uses Revolve studio shots — no background removal needed.
 *
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/fetch-landing-products.ts
 */

import fs from "node:fs/promises";
import path from "node:path";

import { lookupProduct } from "../src/lib/channel3";

const OUT_DIR = path.join(process.cwd(), "public/landing/clothing");

const PRODUCT_URLS: Array<{
  category: string;
  url: string;
  badge?: "New Season" | "Featured";
}> = [
  // Dresses
  { category: "Dresses", url: "https://www.revolve.com/dp/TMIS-WD55/", badge: "Featured" },
  { category: "Dresses", url: "https://www.revolve.com/dp/JLON-WD135/" },
  { category: "Dresses", url: "https://www.revolve.com/dp/DGUI-WD121/", badge: "New Season" },
  { category: "Dresses", url: "https://www.revolve.com/dp/AGOL-WD11/" },
  // Tops
  { category: "Tops", url: "https://www.revolve.com/dp/AGOL-WS294/", badge: "Featured" },
  { category: "Tops", url: "https://www.revolve.com/dp/CITI-WS411/" },
  { category: "Tops", url: "https://www.revolve.com/dp/GRLR-WS193/", badge: "New Season" },
  { category: "Tops", url: "https://www.revolve.com/dp/EAVR-WS8/" },
  // Knitwear
  { category: "Knitwear", url: "https://www.revolve.com/dp/CULG-WD568/", badge: "Featured" },
  { category: "Knitwear", url: "https://www.revolve.com/dp/BLMR-WS11/" },
  { category: "Knitwear", url: "https://www.revolve.com/dp/EAVR-WS128/", badge: "New Season" },
  { category: "Knitwear", url: "https://www.revolve.com/dp/SRGR-WS20/" },
  // Skirts
  { category: "Skirts", url: "https://www.revolve.com/dp/BARD-WQ123/", badge: "Featured" },
  { category: "Skirts", url: "https://www.revolve.com/dp/AGOL-WQ66/" },
  { category: "Skirts", url: "https://www.revolve.com/dp/CITI-WQ88/", badge: "New Season" },
  { category: "Skirts", url: "https://www.revolve.com/dp/GRLR-WQ25/" },
  // Trousers
  { category: "Trousers", url: "https://www.revolve.com/dp/AGOL-WP35/", badge: "Featured" },
  { category: "Trousers", url: "https://www.revolve.com/dp/CITI-WP88/" },
  { category: "Trousers", url: "https://www.revolve.com/dp/HLOR-WP08/", badge: "New Season" },
  { category: "Trousers", url: "https://www.revolve.com/dp/GRLR-WP25/" },
  // Jackets
  { category: "Jackets", url: "https://www.revolve.com/dp/AGOL-WO45/", badge: "Featured" },
  { category: "Jackets", url: "https://www.revolve.com/dp/HLOR-WO08/" },
  { category: "Jackets", url: "https://www.revolve.com/dp/CITI-WO88/", badge: "New Season" },
  { category: "Jackets", url: "https://www.revolve.com/dp/GRLR-WO25/" },
  // Denim
  { category: "Denim", url: "https://www.revolve.com/dp/AGOL-WJ620/", badge: "Featured" },
  { category: "Denim", url: "https://www.revolve.com/dp/AGOL-WJ696/" },
  { category: "Denim", url: "https://www.revolve.com/dp/LEIV-WJ570/", badge: "New Season" },
  { category: "Denim", url: "https://www.revolve.com/dp/AGOL-WJ743/" },
];

type ManifestItem = {
  id: string;
  category: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  badge?: "New Season" | "Featured";
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Revolve titles often end with the brand: "Janine Mini Dress Tiger Mist". */
function splitBrand(title: string): { name: string; brand: string } {
  const parts = title.trim().split(/\s+/);
  if (parts.length < 2) return { name: title, brand: title };

  const brand = parts.at(-1)!;
  const name = parts.slice(0, -1).join(" ");
  return { name, brand };
}

async function downloadImage(url: string, dest: string): Promise<void> {
  const res = await fetch(url, {
    headers: { "User-Agent": "RetailTherapyLanding/1.0" },
  });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const manifest: ManifestItem[] = [];
  const seenIds = new Set<string>();

  for (const entry of PRODUCT_URLS) {
    process.stdout.write(`${entry.category}: ${entry.url} … `);
    try {
      const product = await lookupProduct(entry.url);
      if (!product.imageUrl) throw new Error("no image");

      let id = slugify(product.id || product.name);
      if (seenIds.has(id)) id = `${id}-${manifest.length}`;
      seenIds.add(id);

      const ext = product.imageUrl.includes(".png") ? "png" : "jpg";
      const localFile = `${id}.${ext}`;
      await downloadImage(product.imageUrl, path.join(OUT_DIR, localFile));

      const { name, brand } = splitBrand(product.name);

      manifest.push({
        id,
        category: entry.category,
        name,
        brand,
        price: product.price,
        currency: product.currency,
        imageUrl: `/landing/clothing/${localFile}`,
        badge: entry.badge,
      });

      console.log("ok");
    } catch (err) {
      console.log(`skip (${err instanceof Error ? err.message : err})`);
    }
  }

  await fs.writeFile(
    path.join(OUT_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const ts = `// Generated by scripts/fetch-landing-products.ts — do not edit by hand.
export const CLOTHING_TABS = [
  "Dresses",
  "Tops",
  "Knitwear",
  "Skirts",
  "Trousers",
  "Jackets",
  "Denim",
] as const;

export type ClothingTab = (typeof CLOTHING_TABS)[number];

export type LandingClothingProduct = {
  id: string;
  category: ClothingTab;
  name: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  badge?: "New Season" | "Featured";
};

export const LANDING_CLOTHING_PRODUCTS: LandingClothingProduct[] = ${JSON.stringify(manifest, null, 2)} as LandingClothingProduct[];

export function productsForTab(tab: ClothingTab): LandingClothingProduct[] {
  return LANDING_CLOTHING_PRODUCTS.filter((p) => p.category === tab);
}

export const LANDING_CLOTHING_PRELOAD = LANDING_CLOTHING_PRODUCTS.filter(
  (p) => p.category === "Dresses",
).map((p) => p.imageUrl);
`;

  await fs.writeFile(
    path.join(process.cwd(), "src/lib/landing-clothing-data.ts"),
    ts,
  );

  console.log(`\nSaved ${manifest.length} products`);
}

void main();
