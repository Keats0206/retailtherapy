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

export function AdminCloseAllButton({
  liveCount,
  size = "sm",
}: {
  liveCount: number;
  size?: "sm" | "micro" | "default" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmCloseAll() {
    setClosing(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/shows/end-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { error?: string; count?: number };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to close live shows");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setClosing(false);
    }
  }

  if (liveCount === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
      >
        Close all ({liveCount})
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!closing) {
            setOpen(next);
            if (!next) setError(null);
          }
        }}
      >
        <DialogContent showCloseButton={!closing}>
          <DialogHeader>
            <DialogTitle>Close all live shows?</DialogTitle>
            <DialogDescription>
              This will force-end {liveCount}{" "}
              {liveCount === 1 ? "show" : "shows"}. Each one moves to its recap
              page and disappears from browse.
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
              disabled={closing}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={closing}
              className="bg-live text-live-foreground hover:bg-live/90"
              onClick={() => void confirmCloseAll()}
            >
              {closing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Closing…
                </>
              ) : (
                `Close all ${liveCount}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
