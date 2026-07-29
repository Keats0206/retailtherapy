/**
 * Stand-in products for the cinema prototype.
 *
 * The real thing reads the host's live trail (see `lib/shows`), where each entry
 * already carries a Channel3 buy link. This exists only so the interaction can be
 * exercised without a live show attached.
 */

export type PrototypeProduct = {
  id: string;
  name: string;
  brand: string;
  price: string;
  sizes: string[];
};

export const PROTOTYPE_CATALOG: PrototypeProduct[] = [
  {
    id: "p1",
    name: "Wool blend car coat",
    brand: "Toteme",
    price: "$420",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "p2",
    name: "Barrel leg jean",
    brand: "Agolde",
    price: "$198",
    sizes: ["24", "25", "26", "27", "28"],
  },
  {
    id: "p3",
    name: "Ribbed crew knit",
    brand: "COS",
    price: "$89",
    sizes: ["XS", "S", "M"],
  },
  {
    id: "p4",
    name: "Leather ballet flat",
    brand: "Le Monde Béryl",
    price: "$340",
    sizes: ["36", "37", "38", "39"],
  },
  {
    id: "p5",
    name: "Silk slip skirt",
    brand: "Vince",
    price: "$225",
    sizes: ["XS", "S", "M", "L"],
  },
];

export type PrototypeChatLine = { author: string; text: string };

/**
 * Canned chat traffic. Weighted toward the things viewers actually say while
 * watching someone shop — sizing, fit, "go back" — since that's what the UI has
 * to accommodate.
 */
export const PROTOTYPE_CHAT_LINES: PrototypeChatLine[] = [
  { author: "mia", text: "wait go back to the coat" },
  { author: "dev", text: "does that run small?" },
  { author: "jules", text: "i have this one, size down 👀" },
  { author: "sam", text: "the barrel leg is so good" },
  { author: "ro", text: "price on the flats?" },
  { author: "kit", text: "add the knit pls" },
  { author: "ash", text: "green one!!" },
  { author: "nat", text: "is that the petite length" },
  { author: "cam", text: "just grabbed the jean 🛒" },
  { author: "lex", text: "how tall are you again" },
];
