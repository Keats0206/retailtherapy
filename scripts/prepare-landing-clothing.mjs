/**
 * One-time asset prep: download clothing photos from the web, remove backgrounds,
 * and write transparent PNGs to public/landing/clothing/.
 *
 * Usage: node scripts/prepare-landing-clothing.mjs
 */

import { removeBackground } from "@imgly/background-removal-node";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/landing/clothing");

/** @type {Array<{ id: string; category: string; name: string; brand: string; price: number; sourceUrl: string }>} */
const ITEMS = [
  // Dresses
  {
    id: "dress-floral",
    category: "Dresses",
    name: "Floral midi dress",
    brand: "Reformation",
    price: 248,
    sourceUrl:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop",
  },
  {
    id: "dress-slip",
    category: "Dresses",
    name: "Silk slip dress",
    brand: "Totême",
    price: 520,
    sourceUrl:
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92d1?w=800&auto=format&fit=crop",
  },
  {
    id: "dress-linen",
    category: "Dresses",
    name: "Linen wrap dress",
    brand: "Arket",
    price: 129,
    sourceUrl:
      "https://images.unsplash.com/photo-1496747611176-843222e1ad57?w=800&auto=format&fit=crop",
  },
  {
    id: "dress-off-shoulder",
    category: "Dresses",
    name: "Off-shoulder midi",
    brand: "Self-Portrait",
    price: 395,
    sourceUrl:
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop",
  },
  // Tops
  {
    id: "top-blouse",
    category: "Tops",
    name: "Silk blouse",
    brand: "Equipment",
    price: 280,
    sourceUrl:
      "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&auto=format&fit=crop",
  },
  {
    id: "top-tee",
    category: "Tops",
    name: "Classic cotton tee",
    brand: "James Perse",
    price: 85,
    sourceUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop",
  },
  {
    id: "top-crop",
    category: "Tops",
    name: "Ribbed crop top",
    brand: "Skims",
    price: 58,
    sourceUrl:
      "https://images.unsplash.com/photo-1583743814966-6a8c0109a9f0?w=800&auto=format&fit=crop",
  },
  {
    id: "top-shirt",
    category: "Tops",
    name: "Oxford shirt",
    brand: "Everlane",
    price: 98,
    sourceUrl:
      "https://images.unsplash.com/photo-1622445275463-878c6c281b70?w=800&auto=format&fit=crop",
  },
  // Knitwear
  {
    id: "knit-crew",
    category: "Knitwear",
    name: "Merino crew neck",
    brand: "Uniqlo",
    price: 49,
    sourceUrl:
      "https://images.unsplash.com/photo-1576871337637-bbf73707fb3a?w=800&auto=format&fit=crop",
  },
  {
    id: "knit-cardigan",
    category: "Knitwear",
    name: "Cashmere cardigan",
    brand: "& Other Stories",
    price: 149,
    sourceUrl:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop",
  },
  {
    id: "knit-turtleneck",
    category: "Knitwear",
    name: "Fine-knit turtleneck",
    brand: "COS",
    price: 89,
    sourceUrl:
      "https://images.unsplash.com/photo-1620799140188-3b7a326aa782?w=800&auto=format&fit=crop",
  },
  {
    id: "knit-vest",
    category: "Knitwear",
    name: "Knitted vest",
    brand: "Ganni",
    price: 195,
    sourceUrl:
      "https://images.unsplash.com/photo-1578587018453-89b80a4c0773?w=800&auto=format&fit=crop",
  },
  // Skirts
  {
    id: "skirt-pleated",
    category: "Skirts",
    name: "Pleated midi skirt",
    brand: "Maje",
    price: 325,
    sourceUrl:
      "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&auto=format&fit=crop",
  },
  {
    id: "skirt-denim",
    category: "Skirts",
    name: "Denim mini skirt",
    brand: "Agolde",
    price: 168,
    sourceUrl:
      "https://images.unsplash.com/photo-1551488831-00ecb7896a7c?w=800&auto=format&fit=crop",
  },
  {
    id: "skirt-satin",
    category: "Skirts",
    name: "Satin slip skirt",
    brand: "Staud",
    price: 225,
    sourceUrl:
      "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&auto=format&fit=crop",
  },
  {
    id: "skirt-wrap",
    category: "Skirts",
    name: "Wrap skirt",
    brand: "Realisation Par",
    price: 180,
    sourceUrl:
      "https://images.unsplash.com/photo-1582562124815-c09040d15359?w=800&auto=format&fit=crop",
  },
  // Trousers
  {
    id: "trouser-wide",
    category: "Trousers",
    name: "Wide-leg trousers",
    brand: "The Row",
    price: 890,
    sourceUrl:
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&auto=format&fit=crop",
  },
  {
    id: "trouser-tailored",
    category: "Trousers",
    name: "Tailored wool pant",
    brand: "Joseph",
    price: 445,
    sourceUrl:
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop",
  },
  {
    id: "trouser-cargo",
    category: "Trousers",
    name: "Cargo pant",
    brand: "Nili Lotan",
    price: 395,
    sourceUrl:
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop",
  },
  {
    id: "trouser-linen",
    category: "Trousers",
    name: "Linen drawstring",
    brand: "Eberjey",
    price: 148,
    sourceUrl:
      "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&auto=format&fit=crop",
  },
  // Jackets
  {
    id: "jacket-leather",
    category: "Jackets",
    name: "Leather biker jacket",
    brand: "Acne Studios",
    price: 1200,
    sourceUrl:
      "https://images.unsplash.com/photo-1551028710964-3cde220883eb?w=800&auto=format&fit=crop",
  },
  {
    id: "jacket-blazer",
    category: "Jackets",
    name: "Double-breasted blazer",
    brand: "Sandro",
    price: 495,
    sourceUrl:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop",
  },
  {
    id: "jacket-denim",
    category: "Jackets",
    name: "Oversized denim jacket",
    brand: "Levi's",
    price: 128,
    sourceUrl:
      "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&auto=format&fit=crop",
  },
  {
    id: "jacket-bomber",
    category: "Jackets",
    name: "Satin bomber",
    brand: "Aritzia",
    price: 198,
    sourceUrl:
      "https://images.unsplash.com/photo-1521223895911-f6a140c14731?w=800&auto=format&fit=crop",
  },
  // Denim
  {
    id: "denim-straight",
    category: "Denim",
    name: "Straight-leg jean",
    brand: "Agolde",
    price: 188,
    sourceUrl:
      "https://images.unsplash.com/photo-1542272604-787c3835535b?w=800&auto=format&fit=crop",
  },
  {
    id: "denim-wide",
    category: "Denim",
    name: "Wide-leg jean",
    brand: "Citizens of Humanity",
    price: 228,
    sourceUrl:
      "https://images.unsplash.com/photo-1582418702059-97ebafb35f09?w=800&auto=format&fit=crop",
  },
  {
    id: "denim-vintage",
    category: "Denim",
    name: "Vintage wash jean",
    brand: "Re/Done",
    price: 265,
    sourceUrl:
      "https://images.unsplash.com/photo-1475178626620-a4d074967ade?w=800&auto=format&fit=crop",
  },
  {
    id: "denim-crop",
    category: "Denim",
    name: "Cropped flare jean",
    brand: "Frame",
    price: 248,
    sourceUrl:
      "https://images.unsplash.com/photo-1604176355704-286d4ffad5e2?w=800&auto=format&fit=crop",
  },
];

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const manifest = [];

  for (const item of ITEMS) {
    const outPath = path.join(OUT_DIR, `${item.id}.png`);
    process.stdout.write(`Processing ${item.id}… `);

    try {
      const res = await fetch(item.sourceUrl);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const input = Buffer.from(await res.arrayBuffer());
      const blob = await removeBackground(input);
      const png = Buffer.from(await blob.arrayBuffer());
      await fs.writeFile(outPath, png);

      manifest.push({
        id: item.id,
        category: item.category,
        name: item.name,
        brand: item.brand,
        price: item.price,
        imageUrl: `/landing/clothing/${item.id}.png`,
      });

      console.log("done");
    } catch (err) {
      console.log(`failed (${err.message})`);
    }
  }

  const manifestPath = path.join(OUT_DIR, "manifest.json");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nWrote ${manifest.length} images to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
