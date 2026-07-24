"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { LandingStoreMockup } from "@/components/landing-store-mockup";
import {
  outfitProducts,
  PORTER_OUTFIT_CYCLE_MS,
  PORTER_OUTFITS,
  type PorterProduct,
} from "@/lib/landing-porter-outfits";
import { cn } from "@/lib/utils";

const FLOAT_SLOTS = [
  {
    className: "left-[-10%] top-[6%] z-30 w-[58%] -rotate-6",
    y: [-4, -10, -4],
    duration: 5,
    delay: 0,
  },
  {
    className: "right-[-12%] top-[10%] z-40 w-[54%] rotate-[10deg]",
    y: [-6, -12, -6],
    duration: 6.2,
    delay: 0.35,
  },
  {
    className: "bottom-[-8%] left-[12%] z-50 w-[62%] -rotate-[4deg]",
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
    <div className={cn("pointer-events-none absolute", slot.className)}>
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
              className="h-auto w-full select-none object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
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

      <div className="relative mx-auto w-full max-w-xl overflow-visible sm:max-w-2xl">
        <LandingStoreMockup embedded />

        {outfit.map((product, index) => (
          <FloatingProduct
            key={FLOAT_SLOTS[index]!.className}
            product={product}
            slot={FLOAT_SLOTS[index]!}
            outfitKey={outfitKey}
          />
        ))}
      </div>
    </div>
  );
}
