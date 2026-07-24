"use client";

import { useState } from "react";
import { ChevronDown, Heart, Search, SlidersHorizontal } from "lucide-react";

import {
  CLOTHING_TABS,
  productsForTab,
  type ClothingTab,
} from "@/lib/landing-clothing-data";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const HOST_IMAGE =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&auto=format&fit=crop&crop=face";

const NAV_ITEMS = [
  "Sale",
  "New in",
  "Clothing",
  "Shoes",
  "Bags",
  "Accessories",
];

function ProductCard({
  brand,
  name,
  price,
  currency,
  imageUrl,
  badge,
}: {
  brand: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  badge?: "New Season" | "Featured";
}) {
  return (
    <div className="group flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#fafafa]">
        {badge ? (
          <span className="micro absolute left-2 top-2 z-10 bg-white/90 px-1.5 py-0.5 text-[10px] text-foreground/70">
            {badge}
          </span>
        ) : null}
        <button
          type="button"
          className="absolute right-2 top-2 z-10 text-foreground/25 transition-colors hover:text-foreground/50"
          tabIndex={-1}
          aria-hidden
        >
          <Heart className="size-3.5" strokeWidth={1.5} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col gap-0.5 pt-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wide">
          {brand}
        </span>
        <span className="line-clamp-2 text-[11px] leading-snug text-foreground/70">
          {name}
        </span>
        <span className="pt-0.5 text-[11px] font-medium tabular-nums">
          {formatPrice(price, currency)}
        </span>
      </div>
    </div>
  );
}

export function LandingStoreMockup({
  className,
  embedded = false,
}: {
  className?: string;
  /** Hide eyebrow and tighten chrome when nested inside HeroZStack. */
  embedded?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ClothingTab>("Dresses");
  const products = productsForTab(activeTab);

  return (
    <div className={cn("flex flex-col", embedded ? "gap-0" : "gap-2", className)}>
      {!embedded ? (
        <span className="micro text-muted-foreground">shop any store · demo</span>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-2xl bg-white shadow-lg",
          embedded && "shadow-xl ring-1 ring-foreground/10",
        )}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2.5 bg-[#f5f5f5] px-3 py-2">
          <div className="flex shrink-0 gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-[#FF5F57]" />
            <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="size-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center rounded-md bg-white px-3 py-1">
            <span className="micro truncate text-foreground/50">
              revolve.com/clothing/{activeTab.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Store UI */}
        <div className="relative">
          {/* Nav */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <nav className="hidden items-center gap-4 sm:flex">
              {NAV_ITEMS.map((item) => (
                <span
                  key={item}
                  className={cn(
                    "text-[10px] uppercase tracking-wide",
                    item === "Sale"
                      ? "text-red-600"
                      : item === "Clothing"
                        ? "font-medium text-foreground"
                        : "text-foreground/50",
                  )}
                >
                  {item}
                </span>
              ))}
            </nav>
            <div className="flex items-center gap-1.5 text-foreground/30">
              <Search className="size-3" strokeWidth={1.5} />
              <span className="hidden text-[10px] sm:inline">
                What are you looking for?
              </span>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2">
            <span className="micro flex shrink-0 items-center gap-1 rounded-sm bg-black/5 px-2 py-1 text-[10px] text-foreground/60">
              <SlidersHorizontal className="size-2.5" strokeWidth={1.75} />
              All Filters
            </span>
            {CLOTHING_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "micro shrink-0 rounded-sm px-2 py-1 text-[10px] transition-colors",
                  activeTab === tab
                    ? "bg-foreground text-white"
                    : "bg-black/5 text-foreground/60 hover:bg-black/10",
                )}
              >
                {tab}
              </button>
            ))}
            <span className="micro ml-auto hidden shrink-0 items-center gap-0.5 text-[10px] text-foreground/50 sm:flex">
              Sort by
              <ChevronDown className="size-2.5" strokeWidth={1.75} />
            </span>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 p-3 sm:grid-cols-4 sm:gap-x-4 sm:p-4">
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>

          {/* Live host bubble */}
          <div className="pointer-events-none absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
            <div className="relative size-14 overflow-hidden rounded-full shadow-lg sm:size-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HOST_IMAGE}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-live py-0.5 text-center text-[8px] font-medium uppercase tracking-wider text-live-foreground">
                Live
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
