"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { HeroCtaGroup } from "@/components/hero-cta-group";
import { cn } from "@/lib/utils";

type ScatterCard = {
  src: string;
  /** Absolute-position + size classes for the slot. Hidden below md to keep mobile clean. */
  slot: string;
  rotate: number;
  /** Idle float travel in px. */
  float: number;
  /** Intrinsic pixel size of the source PNG, so the slot reserves the right box. */
  width: number;
  height: number;
};

/**
 * Rendered width of a card, matching the `w-*` classes in each slot. Feeds
 * `sizes` so the optimizer never ships more than ~2x the painted size — the
 * sources are ~1000x1500 cutouts and the largest slot is 160px wide.
 */
const CARD_SIZES = "(min-width: 1024px) 160px, 128px";

const BASE = "/landing/porter-products";

const CARDS: ScatterCard[] = [
  {
    src: `${BASE}/olive-leather-hooded-jacket.png`,
    slot: "left-[4%] top-[5%] w-32 lg:w-40",
    rotate: -8,
    float: -12,
    width: 1127,
    height: 1395,
  },
  {
    src: `${BASE}/silver-oval-aviator-sunglasses.png`,
    slot: "left-[23%] top-[1%] w-24 lg:w-28",
    rotate: 6,
    float: -7,
    width: 1923,
    height: 817,
  },
  {
    src: `${BASE}/dark-brown-leather-jacket.png`,
    slot: "right-[4%] top-[4%] w-32 lg:w-40",
    rotate: 9,
    float: -13,
    width: 1093,
    height: 1439,
  },
  {
    src: `${BASE}/burgundy-polka-dot-halter-top.png`,
    slot: "right-[24%] top-[0%] w-24 lg:w-28",
    rotate: -6,
    float: -8,
    width: 1006,
    height: 1564,
  },
  {
    src: `${BASE}/cognac-pony-hair-shoulder-bag.png`,
    slot: "left-[0%] top-[42%] w-28 lg:w-36",
    rotate: -4,
    float: -10,
    width: 1131,
    height: 1391,
  },
  {
    src: `${BASE}/blue-wide-leg-jeans.png`,
    slot: "right-[1%] top-[38%] w-28 lg:w-36",
    rotate: 6,
    float: -12,
    width: 894,
    height: 1759,
  },
  {
    src: `${BASE}/caramel-suede-midi-skirt.png`,
    slot: "left-[6%] bottom-[3%] w-28 lg:w-36",
    rotate: 5,
    float: -10,
    width: 1008,
    height: 1560,
  },
  {
    src: `${BASE}/burgundy-ankle-strap-pump.png`,
    slot: "right-[4%] bottom-[6%] w-24 lg:w-32",
    rotate: -7,
    float: -8,
    width: 1411,
    height: 1115,
  },
  {
    src: `${BASE}/brown-suede-structured-tote.png`,
    slot: "left-[26%] bottom-[-1%] w-24 lg:w-32",
    rotate: -5,
    float: -9,
    width: 1174,
    height: 1339,
  },
  {
    src: `${BASE}/cream-lace-collar-blouse.png`,
    slot: "right-[25%] bottom-[0%] w-24 lg:w-32",
    rotate: 6,
    float: -11,
    width: 1155,
    height: 1362,
  },
];

/** Cards in the top row land first, so they carry the LCP fetch priority. */
const PRIORITY_CARDS = 2;

const textContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const textItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardsContainer: Variants = {
  hidden: {},
  show: {
    // Cards land only after the headline block has settled.
    transition: { staggerChildren: 0.09, delayChildren: 0.7 },
  },
};

const cardItem: Variants = {
  hidden: { opacity: 0, scale: 0.6, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 190, damping: 17 },
  },
};

function ScatterCard({ card, index }: { card: ScatterCard; index: number }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={cardItem}
      style={{ rotate: card.rotate }}
      // The drop-shadow lives here rather than on the floating child: a filter
      // on an element that animates forever makes the compositor re-rasterize
      // the shadow every frame. On this static parent it rasterizes once.
      className={cn(
        "pointer-events-auto absolute drop-shadow-[0_18px_35px_rgba(0,0,0,0.28)]",
        card.slot,
      )}
    >
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, card.float, 0] }}
        transition={
          reducedMotion
            ? undefined
            : {
                duration: 4.6 + index * 0.35,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
        whileHover={
          reducedMotion
            ? undefined
            : {
                scale: [1, 1.08, 1],
                transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
              }
        }
        className="cursor-pointer"
      >
        <Image
          src={card.src}
          alt=""
          width={card.width}
          height={card.height}
          sizes={CARD_SIZES}
          priority={index < PRIORITY_CARDS}
          className="h-auto w-full select-none object-contain"
        />
      </motion.div>
    </motion.div>
  );
}

export default function HeroScatterMotion({
  canHost = false,
}: {
  canHost?: boolean;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="relative mx-auto flex min-h-[680px] w-full max-w-6xl flex-col items-center justify-center overflow-hidden px-6 py-16 sm:min-h-[740px] lg:min-h-[820px]"
    >
      <motion.div
        variants={cardsContainer}
        aria-hidden
        // Inset from the clipping edge so each card's `0 18px 35px` drop shadow
        // renders inside the container instead of being sliced off against the
        // header and footer.
        className="pointer-events-none absolute inset-x-8 inset-y-14 hidden md:block"
      >
        {CARDS.map((card, index) => (
          <ScatterCard key={card.src} card={card} index={index} />
        ))}
      </motion.div>

      <motion.div
        variants={textContainer}
        className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"
      >
        <motion.span
          variants={textItem}
          className="font-brand text-base uppercase tracking-[0.3em] text-muted-foreground"
        >
          frontrow
        </motion.span>
        <motion.h1
          variants={textItem}
          className="font-brand text-5xl font-normal leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
        >
          watch people shop.
        </motion.h1>
        <motion.p
          variants={textItem}
          className="max-w-md text-lg leading-relaxed text-muted-foreground sm:text-xl"
        >
          Hosts go live, add links to what&rsquo;s on screen, and let the room
          vote on what&rsquo;s worth it.
        </motion.p>
        <motion.div variants={textItem}>
          <HeroCtaGroup canHost={canHost} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
