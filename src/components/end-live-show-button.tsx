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

export function EndLiveShowButton({
  slug,
  title,
  size = "sm",
  className,
  onEnded,
}: {
  slug: string;
  title: string;
  size?: "sm" | "micro" | "default" | "lg";
  className?: string;
  /** Called after a successful end, before router.refresh(). */
  onEnded?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmEnd() {
    setEnding(true);
    setError(null);

    try {
      const res = await fetch(`/api/shows/${slug}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok || data.status !== "ended") {
        throw new Error(data.error ?? "Failed to end show");
      }

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
        End show
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
            <DialogTitle>End this show?</DialogTitle>
            <DialogDescription>
              &ldquo;{title}&rdquo; will move to your past shows. Viewers will
              see the recap at /s/{slug}. You can&rsquo;t go live on this link
              again.
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
              Keep live
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
                  Ending…
                </>
              ) : (
                "End show"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
