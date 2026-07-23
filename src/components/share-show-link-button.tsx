"use client";

import { useState } from "react";
import { Link2, Share2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type ShareShowLinkButtonProps = {
  slug: string;
  className?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
  showPath?: boolean;
};

export function ShareShowLinkButton({
  slug,
  className,
  size = "lg",
  variant = "outline",
  showPath = false,
}: ShareShowLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const sharePath = `/s/${slug}`;

  async function shareLink() {
    const url = `${window.location.origin}${sharePath}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: "Join my show" });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={() => void shareLink()}
    >
      {copied ? <Link2 /> : <Share2 />}
      <span>{copied ? "Link copied!" : "Share show link"}</span>
      {showPath ? (
        <span className="hidden font-normal text-muted-foreground sm:inline">
          {sharePath}
        </span>
      ) : null}
    </Button>
  );
}
