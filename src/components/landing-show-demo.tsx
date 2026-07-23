"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DEMO_PHASE_MS,
  DEMO_PHASE_ORDER,
  DEMO_VIEWER_COUNT,
  LANDING_DEMO_PRODUCTS,
  LANDING_HOST_IMAGE,
  type DemoPhase,
  type LandingDemoProduct,
} from "@/lib/landing-demo-data";
import { formatCount, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function nextPhase(phase: DemoPhase): DemoPhase {
  const index = DEMO_PHASE_ORDER.indexOf(phase);
  return DEMO_PHASE_ORDER[(index + 1) % DEMO_PHASE_ORDER.length]!;
}

function DemoProductRail({
  product,
  phase,
  votes,
  buyPct,
  productKey,
}: {
  product: LandingDemoProduct;
  phase: DemoPhase;
  votes: { buy: number; skip: number };
  buyPct: number;
  productKey: string;
}) {
  const total = votes.buy + votes.skip;
  const transitioning = phase === "transition";

  return (
    <div className="flex min-h-0 w-full flex-col border-t border-border bg-background lg:w-44 lg:border-t-0 lg:border-l xl:w-48">
      <div
        key={productKey}
        className={cn(
          "flex flex-1 flex-col px-3 py-3",
          phase === "pinning" && "motion-safe:animate-demo-pin-in",
          transitioning && "opacity-0 transition-opacity duration-500",
        )}
      >
        <span className="micro text-muted-foreground">On screen now</span>

        {product.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.imageUrl}
            alt={product.name}
            className="mt-2 aspect-square w-full bg-muted object-cover"
          />
        )}

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <h3 className="micro min-w-0 leading-snug">{product.name}</h3>
          <span className="shrink-0 text-xs tabular-nums">
            {formatPrice(product.price, product.currency)}
          </span>
        </div>

        <span className="micro mt-1 text-muted-foreground">{product.retailer}</span>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="micro text-muted-foreground">Should they buy it?</span>
            <span className="micro text-muted-foreground tabular-nums">
              {total} {total === 1 ? "vote" : "votes"}
            </span>
          </div>
          <Progress value={buyPct} className="gap-0" />
          <div className="mt-2 grid grid-cols-2 gap-1">
            <div className="micro rounded-md border border-border px-2 py-1.5 text-center tabular-nums">
              Buy · {votes.buy}
            </div>
            <div className="micro rounded-md border border-border px-2 py-1.5 text-center tabular-nums text-muted-foreground">
              Not buy · {votes.skip}
            </div>
          </div>
          {buyPct > 0 && (
            <p className="micro mt-2 text-center text-pop tabular-nums">
              {buyPct}% say buy
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoChatOverlay({
  product,
  phase,
  chatTick,
}: {
  product: LandingDemoProduct;
  phase: DemoPhase;
  chatTick: number;
}) {
  const showChat = phase === "chatting" || phase === "hold";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3">
      {product.chatLines.map((line, index) => {
        const visible =
          showChat && chatTick >= line.delayMs;
        return (
          <div
            key={`${line.text}-${index}`}
            className={cn(
              "max-w-[75%] rounded-2xl rounded-bl-sm bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur-sm transition-all duration-500 ease-out",
              index % 2 === 1 && "self-end rounded-bl-2xl rounded-br-sm",
              visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}

export function LandingShowDemo({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const staticProduct = LANDING_DEMO_PRODUCTS[0]!;

  const [productIndex, setProductIndex] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>("pinning");
  const [votes, setVotes] = useState({ buy: 0, skip: 0 });
  const [buyPct, setBuyPct] = useState(0);
  const [viewers, setViewers] = useState(DEMO_VIEWER_COUNT.start);
  const [chatTick, setChatTick] = useState(0);

  const product = reducedMotion
    ? staticProduct
    : LANDING_DEMO_PRODUCTS[productIndex]!;

  // Phase state machine (~12s loop)
  useEffect(() => {
    if (reducedMotion) return;

    const timer = window.setTimeout(() => {
      setPhase((current) => {
        const next = nextPhase(current);
        if (next === "pinning" && current === "transition") {
          setProductIndex((i) => (i + 1) % LANDING_DEMO_PRODUCTS.length);
        }
        if (next === "pinning") {
          setVotes({ buy: 0, skip: 0 });
          setBuyPct(0);
          setChatTick(0);
        }
        if (next === "chatting") {
          setChatTick(0);
        }
        return next;
      });
    }, DEMO_PHASE_MS[phase]);

    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion]);

  // Vote + viewer count animation during voting phase
  useEffect(() => {
    if (reducedMotion) {
      const timer = window.setTimeout(() => {
        setVotes({
          buy: staticProduct.voteTarget.buy,
          skip: staticProduct.voteTarget.skip,
        });
        setBuyPct(staticProduct.voteTarget.buyPct);
        setViewers(DEMO_VIEWER_COUNT.end);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (phase !== "voting") {
      if (phase === "chatting" || phase === "hold" || phase === "transition") {
        const timer = window.setTimeout(() => {
          setVotes({
            buy: product.voteTarget.buy,
            skip: product.voteTarget.skip,
          });
          setBuyPct(product.voteTarget.buyPct);
          setViewers(DEMO_VIEWER_COUNT.end);
        }, 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    const target = product.voteTarget;
    const duration = DEMO_PHASE_MS.voting;
    const start = performance.now();
    let frame = 0;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setVotes({
        buy: Math.round(target.buy * eased),
        skip: Math.round(target.skip * eased),
      });
      setBuyPct(Math.round(target.buyPct * eased));
      setViewers(
        Math.round(
          DEMO_VIEWER_COUNT.start +
            (DEMO_VIEWER_COUNT.end - DEMO_VIEWER_COUNT.start) * eased,
        ),
      );
      if (t < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, product, reducedMotion, staticProduct]);

  // Chat stagger timer during chatting phase
  useEffect(() => {
    if (reducedMotion || phase !== "chatting") return;

    const start = performance.now();
    let frame = 0;

    function tick(now: number) {
      setChatTick(now - start);
      if (now - start < DEMO_PHASE_MS.chatting) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, productIndex, reducedMotion]);

  const transitioning = phase === "transition";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="micro text-muted-foreground">live now · demo</span>

      <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10 shadow-lg">
        <div className="flex flex-col lg:flex-row">
          {/* Stage */}
          <div className="relative aspect-video min-w-0 flex-1 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LANDING_HOST_IMAGE}
              alt=""
              className={cn(
                "h-full w-full object-cover transition-opacity duration-500",
                transitioning ? "opacity-70" : "opacity-100",
              )}
            />

            <Badge
              variant="destructive"
              size="micro"
              className="absolute left-3 top-3 bg-live text-live-foreground"
            >
              <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
              Live
            </Badge>

            <span className="micro absolute right-3 top-3 rounded-md bg-black/50 px-2 py-1 tabular-nums text-white backdrop-blur-sm">
              {formatCount(viewers)} watching
            </span>

            <DemoChatOverlay
              product={reducedMotion ? staticProduct : product}
              phase={reducedMotion ? "hold" : phase}
              chatTick={reducedMotion ? Infinity : chatTick}
            />
          </div>

          <DemoProductRail
            product={reducedMotion ? staticProduct : product}
            phase={reducedMotion ? "hold" : phase}
            votes={
              reducedMotion
                ? {
                    buy: staticProduct.voteTarget.buy,
                    skip: staticProduct.voteTarget.skip,
                  }
                : votes
            }
            buyPct={reducedMotion ? staticProduct.voteTarget.buyPct : buyPct}
            productKey={`${product.id}-${productIndex}`}
          />
        </div>
      </div>
    </div>
  );
}
