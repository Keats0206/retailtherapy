"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

export function DeleteShowButton({
  slug,
  title,
  disabled = false,
}: {
  slug: string;
  title: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/shows/${slug}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete show");
      }

      trackEvent(AnalyticsEvent.SHOW_DELETE, { area: "browse" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={disabled ? "End the show before deleting" : "Delete show"}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (!disabled) setOpen(true);
              }}
            >
              <Trash2 />
            </Button>
          }
        />
        <TooltipContent>
          {disabled ? "End the show before deleting" : "Delete show"}
        </TooltipContent>
      </Tooltip>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!deleting) {
            setOpen(next);
            if (!next) setError(null);
          }
        }}
      >
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Delete this show?</DialogTitle>
            <DialogDescription>
              &ldquo;{title}&rdquo; and its recap will be removed from your
              home. The viewer link at /s/{slug} will stop working.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="border-l-2 border-destructive py-1 pl-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete show"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
