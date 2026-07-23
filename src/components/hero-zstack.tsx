"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import {
  HERO_SHOPPER_FALLBACK,
  HERO_SHOPPER_IMAGE,
  outfitProducts,
  PORTER_OUTFIT_CYCLE_MS,
  PORTER_OUTFITS,
  type PorterProduct,
} from "@/lib/landing-porter-outfits";
import { cn } from "@/lib/utils";

const FLOAT_SLOTS = [
  {
    className: "left-[0%] top-[4%] z-20 w-[36%] -rotate-6",
    y: [-4, -10, -4],
    duration: 5,
    delay: 0,
  },
  {
    className: "right-[-4%] top-[12%] z-30 w-[32%] rotate-[10deg]",
    y: [-6, -12, -6],
    duration: 6.2,
    delay: 0.35,
  },
  {
    className: "bottom-[2%] left-[16%] z-40 w-[40%] -rotate-[4deg]",
    y: [-3, -8, -3],
    duration: 4.8,
    delay: 0.7,
  },
] as const;

function FloatingProduct({
  product,
  slot,
  outfitKey,
}: {
  product: PorterProduct;
  slot: (typeof FLOAT_SLOTS)[number];
  outfitKey: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={cn("absolute", slot.className)}>
      <motion.div
        animate={reducedMotion ? undefined : { y: [...slot.y] }}
        transition={
          reducedMotion
            ? undefined
            : {
                duration: slot.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: slot.delay,
              }
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${outfitKey}-${product.id}`}
            initial={{ opacity: 0, scale: 0.82, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt=""
              className="h-auto w-full select-none object-contain drop-shadow-[0_14px_32px_rgba(0,0,0,0.16)]"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ShopperLayer() {
  const [src, setSrc] = useState(HERO_SHOPPER_IMAGE);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0 z-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Host shopping live"
        className={cn(
          "h-full w-full select-none object-contain transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (src !== HERO_SHOPPER_FALLBACK) {
            setSrc(HERO_SHOPPER_FALLBACK);
            setLoaded(false);
          }
        }}
      />
      {!loaded && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[2rem] border border-dashed border-foreground/15 bg-muted/40 text-center backdrop-blur-sm"
          aria-hidden
        >
          <span className="micro text-muted-foreground">hero-shopper.png</span>
        </div>
      )}
    </div>
  );
}

export function HeroZStack({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const [outfitIndex, setOutfitIndex] = useState(0);

  const outfit = outfitProducts(PORTER_OUTFITS[outfitIndex]!);
  const outfitKey = `${outfitIndex}-${PORTER_OUTFITS[outfitIndex]!.join("-")}`;

  useEffect(() => {
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setOutfitIndex((current) => (current + 1) % PORTER_OUTFITS.length);
    }, PORTER_OUTFIT_CYCLE_MS);

    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="micro text-muted-foreground">pinned on screen · demo</span>

      <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-visible sm:max-w-lg">
        <div className="absolute inset-[6%] z-0 rounded-[2rem] bg-gradient-to-b from-muted/50 to-muted/15" />

        <ShopperLayer />

        {outfit.map((product, index) => (
          <FloatingProduct
            key={FLOAT_SLOTS[index]!.className}
            product={product}
            slot={FLOAT_SLOTS[index]!}
            outfitKey={outfitKey}
          />
        ))}

        <span className="micro absolute right-[4%] top-[8%] z-50 inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-live-foreground shadow-sm">
          <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/70" />
          live
        </span>
      </div>
    </div>
  );
}
