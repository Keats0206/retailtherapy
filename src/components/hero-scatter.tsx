"use client";

import dynamic from "next/dynamic";

import { HeroCtaGroup } from "@/components/hero-cta-group";

const HeroScatterMotion = dynamic(
  () => import("@/components/hero-scatter-motion"),
  {
    ssr: false,
    loading: () => <HeroScatterStatic canHost={false} />,
  },
);

type HeroScatterProps = {
  canHost?: boolean;
};

/** Static shell shown while framer-motion loads and for no-JS fallback. */
function HeroScatterStatic({ canHost = false }: HeroScatterProps) {
  return (
    <div className="relative mx-auto flex min-h-[680px] w-full max-w-6xl flex-col items-center justify-center overflow-hidden px-6 py-16 sm:min-h-[740px] lg:min-h-[820px]">
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="font-brand text-base uppercase tracking-[0.3em] text-muted-foreground">
          frontrow
        </span>
        <h1 className="font-brand text-5xl font-normal leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          watch people shop.
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Hosts go live, add links to what&rsquo;s on screen, and let the room
          vote on what&rsquo;s worth it.
        </p>
        <HeroCtaGroup canHost={canHost} />
      </div>
    </div>
  );
}

export function HeroScatter({ canHost = false }: HeroScatterProps) {
  return <HeroScatterMotion canHost={canHost} />;
}
