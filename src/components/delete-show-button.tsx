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
import { readResponseJson } from "@/lib/fetch-json";
import { viewerShowPath } from "@/lib/show-urls";

export function DeleteShowButton({
  slug,
  title,
  disabled = false,
  variant = "host",
  onDeleted,
}: {
  slug: string;
  title: string;
  disabled?: boolean;
  /** Host deletes their own show; admin deletes any ended show. */
  variant?: "host" | "admin";
  /** Called after a successful delete, before router.refresh(). */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = variant === "admin";
  const deleteUrl = isAdmin ? `/api/admin/shows/${slug}` : `/api/shows/${slug}`;
  const disabledLabel = isAdmin
    ? "Close the show before deleting"
    : "End the show before deleting";

  async function confirmDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(deleteUrl, { method: "DELETE" });
      const data = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete show");
      }

      trackEvent(AnalyticsEvent.SHOW_DELETE, {
        area: isAdmin ? "admin" : "browse",
      });
      setOpen(false);
      onDeleted?.();
      if (!onDeleted) router.refresh();
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
              aria-label={disabled ? disabledLabel : "Delete show"}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (!disabled) setOpen(true);
              }}
            >
              <Trash2 />
            </Button>
          }
        />
        <TooltipContent>{disabled ? disabledLabel : "Delete show"}</TooltipContent>
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
              &ldquo;{title}&rdquo; and its recap will be removed
              {isAdmin ? " for everyone" : " from your home"}. The viewer link
              at {viewerShowPath(slug)} will stop working.
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
