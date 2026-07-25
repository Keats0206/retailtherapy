"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type ScatterCard = {
  src: string;
  /** Absolute-position + size classes for the slot. Hidden below md to keep mobile clean. */
  slot: string;
  rotate: number;
  /** Idle float travel in px. */
  float: number;
};

const BASE = "/landing/porter-products";

// Transparent-background clothing cutouts, scattered Luma-style around the headline.
const CARDS: ScatterCard[] = [
  {
    src: `${BASE}/olive-leather-hooded-jacket.png`,
    slot: "left-[4%] top-[5%] w-32 lg:w-40",
    rotate: -8,
    float: -12,
  },
  {
    src: `${BASE}/silver-oval-aviator-sunglasses.png`,
    slot: "left-[23%] top-[1%] w-24 lg:w-28",
    rotate: 6,
    float: -7,
  },
  {
    src: `${BASE}/dark-brown-leather-jacket.png`,
    slot: "right-[4%] top-[4%] w-32 lg:w-40",
    rotate: 9,
    float: -13,
  },
  {
    src: `${BASE}/burgundy-polka-dot-halter-top.png`,
    slot: "right-[24%] top-[0%] w-24 lg:w-28",
    rotate: -6,
    float: -8,
  },
  {
    src: `${BASE}/cognac-pony-hair-shoulder-bag.png`,
    slot: "left-[0%] top-[42%] w-28 lg:w-36",
    rotate: -4,
    float: -10,
  },
  {
    src: `${BASE}/blue-wide-leg-jeans.png`,
    slot: "right-[1%] top-[38%] w-28 lg:w-36",
    rotate: 6,
    float: -12,
  },
  {
    src: `${BASE}/caramel-suede-midi-skirt.png`,
    slot: "left-[6%] bottom-[3%] w-28 lg:w-36",
    rotate: 5,
    float: -10,
  },
  {
    src: `${BASE}/burgundy-ankle-strap-pump.png`,
    slot: "right-[4%] bottom-[6%] w-24 lg:w-32",
    rotate: -7,
    float: -8,
  },
  {
    src: `${BASE}/brown-suede-structured-tote.png`,
    slot: "left-[26%] bottom-[-1%] w-24 lg:w-32",
    rotate: -5,
    float: -9,
  },
  {
    src: `${BASE}/cream-lace-collar-blouse.png`,
    slot: "right-[25%] bottom-[0%] w-24 lg:w-32",
    rotate: 6,
    float: -11,
  },
];

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
      className={cn("pointer-events-auto absolute", card.slot)}
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.src}
          alt=""
          className="h-auto w-full select-none object-contain drop-shadow-[0_18px_35px_rgba(0,0,0,0.28)]"
        />
      </motion.div>
    </motion.div>
  );
}

export function HeroScatter() {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="relative mx-auto flex min-h-[620px] w-full max-w-6xl flex-col items-center justify-center overflow-hidden px-6 py-16 sm:min-h-[680px] lg:min-h-[760px]"
    >
      {/* Scattered cutouts — decorative, behind the copy. */}
      <motion.div
        variants={cardsContainer}
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden md:block"
      >
        {CARDS.map((card, index) => (
          <ScatterCard key={card.src} card={card} index={index} />
        ))}
      </motion.div>

      {/* Center copy — lands first. */}
      <motion.div
        variants={textContainer}
        className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"
      >
        <motion.span
          variants={textItem}
          className="text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground"
        >
          frontrow
        </motion.span>
        <motion.h1
          variants={textItem}
          className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
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
        <motion.div variants={textItem} className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="rounded-full bg-foreground px-8 text-background hover:bg-foreground/90"
            render={<Link href="/browse" />}
            onClick={() =>
              trackEvent(AnalyticsEvent.CTA_BROWSE, { area: "hero" })
            }
          >
            Browse live shows
          </Button>
          <Button
            variant="ghost"
            size="micro"
            className="text-muted-foreground"
            render={<Link href="/apply" />}
            onClick={() =>
              trackEvent(AnalyticsEvent.CTA_APPLY, { area: "hero" })
            }
          >
            Apply to host &rarr;
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
