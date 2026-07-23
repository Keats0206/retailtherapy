export type PorterProductCategory =
  | "top"
  | "bottom"
  | "outerwear"
  | "shoes"
  | "bag"
  | "accessory";

export type PorterProduct = {
  id: string;
  name: string;
  imageUrl: string;
  category: PorterProductCategory;
};

const BASE = "/landing/porter-products";

export const PORTER_PRODUCTS: Record<string, PorterProduct> = {
  "beige-zip-front-bomber-jacket": {
    id: "beige-zip-front-bomber-jacket",
    name: "Beige zip-front bomber",
    imageUrl: `${BASE}/beige-zip-front-bomber-jacket.png`,
    category: "outerwear",
  },
  "black-cream-plaid-shirt": {
    id: "black-cream-plaid-shirt",
    name: "Black & cream plaid shirt",
    imageUrl: `${BASE}/black-cream-plaid-shirt.png`,
    category: "top",
  },
  "black-mesh-studded-ballet-flat": {
    id: "black-mesh-studded-ballet-flat",
    name: "Black mesh studded flat",
    imageUrl: `${BASE}/black-mesh-studded-ballet-flat.png`,
    category: "shoes",
  },
  "black-suede-hobo-bag": {
    id: "black-suede-hobo-bag",
    name: "Black suede hobo bag",
    imageUrl: `${BASE}/black-suede-hobo-bag.png`,
    category: "bag",
  },
  "blue-wide-leg-jeans": {
    id: "blue-wide-leg-jeans",
    name: "Blue wide-leg jeans",
    imageUrl: `${BASE}/blue-wide-leg-jeans.png`,
    category: "bottom",
  },
  "brown-croc-embellished-ballet-flat": {
    id: "brown-croc-embellished-ballet-flat",
    name: "Brown croc ballet flat",
    imageUrl: `${BASE}/brown-croc-embellished-ballet-flat.png`,
    category: "shoes",
  },
  "brown-suede-structured-tote": {
    id: "brown-suede-structured-tote",
    name: "Brown suede tote",
    imageUrl: `${BASE}/brown-suede-structured-tote.png`,
    category: "bag",
  },
  "burgundy-ankle-strap-pump": {
    id: "burgundy-ankle-strap-pump",
    name: "Burgundy ankle-strap pump",
    imageUrl: `${BASE}/burgundy-ankle-strap-pump.png`,
    category: "shoes",
  },
  "burgundy-embossed-pencil-skirt": {
    id: "burgundy-embossed-pencil-skirt",
    name: "Burgundy embossed pencil skirt",
    imageUrl: `${BASE}/burgundy-embossed-pencil-skirt.png`,
    category: "bottom",
  },
  "burgundy-polka-dot-halter-top": {
    id: "burgundy-polka-dot-halter-top",
    name: "Burgundy polka-dot halter",
    imageUrl: `${BASE}/burgundy-polka-dot-halter-top.png`,
    category: "top",
  },
  "caramel-suede-midi-skirt": {
    id: "caramel-suede-midi-skirt",
    name: "Caramel suede midi skirt",
    imageUrl: `${BASE}/caramel-suede-midi-skirt.png`,
    category: "bottom",
  },
  "cognac-pony-hair-shoulder-bag": {
    id: "cognac-pony-hair-shoulder-bag",
    name: "Cognac pony-hair shoulder bag",
    imageUrl: `${BASE}/cognac-pony-hair-shoulder-bag.png`,
    category: "bag",
  },
  "cream-lace-collar-blouse": {
    id: "cream-lace-collar-blouse",
    name: "Cream lace-collar blouse",
    imageUrl: `${BASE}/cream-lace-collar-blouse.png`,
    category: "top",
  },
  "dark-brown-leather-jacket": {
    id: "dark-brown-leather-jacket",
    name: "Dark brown leather jacket",
    imageUrl: `${BASE}/dark-brown-leather-jacket.png`,
    category: "outerwear",
  },
  "ivory-ribbed-mock-neck-top": {
    id: "ivory-ribbed-mock-neck-top",
    name: "Ivory ribbed mock-neck",
    imageUrl: `${BASE}/ivory-ribbed-mock-neck-top.png`,
    category: "top",
  },
  "light-blue-cropped-denim-jacket": {
    id: "light-blue-cropped-denim-jacket",
    name: "Light blue cropped denim jacket",
    imageUrl: `${BASE}/light-blue-cropped-denim-jacket.png`,
    category: "outerwear",
  },
  "olive-leather-hooded-jacket": {
    id: "olive-leather-hooded-jacket",
    name: "Olive leather hooded jacket",
    imageUrl: `${BASE}/olive-leather-hooded-jacket.png`,
    category: "outerwear",
  },
  "silver-oval-aviator-sunglasses": {
    id: "silver-oval-aviator-sunglasses",
    name: "Silver oval aviators",
    imageUrl: `${BASE}/silver-oval-aviator-sunglasses.png`,
    category: "accessory",
  },
  "tan-suede-low-heel-pump": {
    id: "tan-suede-low-heel-pump",
    name: "Tan suede low-heel pump",
    imageUrl: `${BASE}/tan-suede-low-heel-pump.png`,
    category: "shoes",
  },
  "taupe-woven-suede-shoulder-bag": {
    id: "taupe-woven-suede-shoulder-bag",
    name: "Taupe woven suede bag",
    imageUrl: `${BASE}/taupe-woven-suede-shoulder-bag.png`,
    category: "bag",
  },
  "washed-black-wide-leg-jeans": {
    id: "washed-black-wide-leg-jeans",
    name: "Washed black wide-leg jeans",
    imageUrl: `${BASE}/washed-black-wide-leg-jeans.png`,
    category: "bottom",
  },
};

/** Three product ids per look — top/bottom/shoe, top/bottom/bag, etc. */
export const PORTER_OUTFITS: readonly [string, string, string][] = [
  [
    "burgundy-polka-dot-halter-top",
    "burgundy-embossed-pencil-skirt",
    "burgundy-ankle-strap-pump",
  ],
  [
    "cream-lace-collar-blouse",
    "blue-wide-leg-jeans",
    "tan-suede-low-heel-pump",
  ],
  [
    "dark-brown-leather-jacket",
    "washed-black-wide-leg-jeans",
    "black-suede-hobo-bag",
  ],
  [
    "ivory-ribbed-mock-neck-top",
    "caramel-suede-midi-skirt",
    "cognac-pony-hair-shoulder-bag",
  ],
  [
    "black-cream-plaid-shirt",
    "blue-wide-leg-jeans",
    "silver-oval-aviator-sunglasses",
  ],
  [
    "olive-leather-hooded-jacket",
    "burgundy-embossed-pencil-skirt",
    "brown-croc-embellished-ballet-flat",
  ],
  [
    "light-blue-cropped-denim-jacket",
    "washed-black-wide-leg-jeans",
    "taupe-woven-suede-shoulder-bag",
  ],
  [
    "beige-zip-front-bomber-jacket",
    "blue-wide-leg-jeans",
    "black-mesh-studded-ballet-flat",
  ],
] as const;

export function outfitProducts(
  ids: readonly [string, string, string],
): [PorterProduct, PorterProduct, PorterProduct] {
  return ids.map((id) => PORTER_PRODUCTS[id]!) as [
    PorterProduct,
    PorterProduct,
    PorterProduct,
  ];
}

export const PORTER_OUTFIT_CYCLE_MS = 7000;

export const HERO_SHOPPER_IMAGE = "/landing/hero-shopper.png";

/** Fallback until hero-shopper.png is added */
export const HERO_SHOPPER_FALLBACK =
  "https://images.unsplash.com/photo-1483985988355-763728419177?w=900&auto=format&fit=crop";

export const PORTER_HERO_PRELOAD = [
  HERO_SHOPPER_IMAGE,
  ...outfitProducts(PORTER_OUTFITS[0]!).map((p) => p.imageUrl),
];
