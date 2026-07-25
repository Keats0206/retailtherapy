"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

export function EndLiveShowButton({
  slug,
  title,
  size = "sm",
  className,
  variant = "host",
  onEnded,
}: {
  slug: string;
  title: string;
  size?: "sm" | "micro" | "default" | "lg";
  className?: string;
  /** Host ends their own show; admin force-ends any show. */
  variant?: "host" | "admin";
  /** Called after a successful end, before router.refresh(). */
  onEnded?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endUrl =
    variant === "admin"
      ? `/api/admin/shows/${slug}/end`
      : `/api/shows/${slug}/end`;
  const buttonLabel = variant === "admin" ? "Close show" : "End show";

  async function confirmEnd() {
    setEnding(true);
    setError(null);

    try {
      const res = await fetch(endUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok || data.status !== "ended") {
        throw new Error(data.error ?? "Failed to end show");
      }

      trackEvent(AnalyticsEvent.SHOW_END, {
        area: variant === "admin" ? "admin" : "browse",
      });
      setOpen(false);
      onEnded?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setEnding(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!ending) {
            setOpen(next);
            if (!next) setError(null);
          }
        }}
      >
        <DialogContent showCloseButton={!ending}>
          <DialogHeader>
            <DialogTitle>
              {variant === "admin" ? "Close this show?" : "End this show?"}
            </DialogTitle>
            <DialogDescription>
              {variant === "admin" ? (
                <>
                  &ldquo;{title}&rdquo; will be removed from browse and moved to
                  the recap at /s/{slug}. The host cannot go live on this link
                  again.
                </>
              ) : (
                <>
                  &ldquo;{title}&rdquo; will move to your past shows. Viewers
                  will see the recap at /s/{slug}. You can&rsquo;t go live on
                  this link again.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={ending}
              onClick={() => setOpen(false)}
            >
              {variant === "admin" ? "Cancel" : "Keep live"}
            </Button>
            <Button
              type="button"
              disabled={ending}
              className="bg-live text-live-foreground hover:bg-live/90"
              onClick={() => void confirmEnd()}
            >
              {ending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {variant === "admin" ? "Closing…" : "Ending…"}
                </>
              ) : (
                buttonLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
