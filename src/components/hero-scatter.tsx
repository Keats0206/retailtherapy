"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const HeroScatterMotion = dynamic(
  () => import("@/components/hero-scatter-motion"),
  {
    ssr: false,
    loading: () => <HeroScatterStatic />,
  },
);

/** Static shell shown while framer-motion loads and for no-JS fallback. */
function HeroScatterStatic() {
  return (
    <div className="relative mx-auto flex min-h-[620px] w-full max-w-6xl flex-col items-center justify-center overflow-hidden px-6 py-16 sm:min-h-[680px] lg:min-h-[760px]">
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="font-brand text-base uppercase tracking-[0.3em] text-muted-foreground">
          frontrow
        </span>
        <h1 className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          watch people{" "}
          <span className="bg-gradient-to-r from-pop via-live to-pop bg-clip-text text-transparent">
            shop
          </span>
          .
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Hosts go live, add links to what&rsquo;s on screen, and let the room
          vote on what&rsquo;s worth it.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="px-8"
            render={<Link href="/browse" />}
          >
            Browse live shows
          </Button>
          <Button
            variant="ghost"
            size="micro"
            className="text-muted-foreground"
            render={<Link href="/apply" />}
          >
            Join the host waitlist &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}

export function HeroScatter() {
  return <HeroScatterMotion />;
}
