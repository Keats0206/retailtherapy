"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProductLookup } from "@/hooks/use-product-lookup";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import type { Product } from "@/lib/types";
import { isValidHttpsUrl } from "@/lib/validate-url";
import { cn } from "@/lib/utils";

export function HostPinBar({
  onPin,
  variant = "rail",
  className,
}: {
  /** Kept for callers that pass stream state; pin bar only adds new items. */
  pinned?: Product | null;
  onPin: (product: Product) => void;
  onUnpin?: () => void;
  variant?: "rail" | "pip";
  className?: string;
}) {
  const isPip = variant === "pip";
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { lookup, loading, error, setError, clearError } = useProductLookup();

  const tryClipboard = useCallback(async () => {
    if (url.trim()) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (isValidHttpsUrl(text)) setUrl(text);
    } catch {
      // Clipboard unavailable or permission denied.
    }
  }, [url]);

  useEffect(() => {
    void tryClipboard();
  }, [tryClipboard]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || loading) return;

    if (!isValidHttpsUrl(trimmed)) {
      setError("Paste a full https:// product link");
      return;
    }

    const product = await lookup(trimmed);
    if (!product) return;

    trackEvent(AnalyticsEvent.HOST_PRODUCT_ADD, { area: "host_studio" });
    onPin(product);
    setUrl("");
    inputRef.current?.focus();
  }

  const canSubmit = isValidHttpsUrl(url.trim()) && !loading;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-border/60",
        isPip ? "p-3" : "px-4 py-3",
        className,
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={url}
            onChange={(e) => {
              clearError();
              setUrl(e.target.value);
            }}
            onFocus={() => void tryClipboard()}
            placeholder="Paste product link…"
            aria-label="Product link"
            disabled={loading}
            className={cn("min-w-0 flex-1", isPip ? "h-9 text-sm" : "h-9")}
          />
          <Button
            type="submit"
            size={isPip ? "sm" : "default"}
            disabled={!canSubmit}
            className="shrink-0 gap-1.5"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Pin className="size-4" />
            )}
            Add
          </Button>
        </div>

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Adds to cart and pins on screen for viewers.
          </p>
        )}
      </form>
    </div>
  );
}
