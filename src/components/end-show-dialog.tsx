"use client";

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
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
  ProgressValue,
} from "@/components/ui/progress";

const ENDING_STEPS = [
  "Stopping broadcast",
  "Saving shopping trail",
  "Packaging recording",
] as const;

export function EndShowDialog({
  open,
  onOpenChange,
  onConfirm,
  ending,
  endingStep,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** True while the post-confirm loading sequence runs. */
  ending: boolean;
  /** 0–ENDING_STEPS.length while ending. */
  endingStep: number;
  error?: string | null;
}) {
  const progress = ending
    ? Math.round((endingStep / ENDING_STEPS.length) * 100)
    : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!ending) onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!ending}>
        {ending ? (
          <>
            <DialogHeader>
              <DialogTitle>Wrapping up your show</DialogTitle>
              <DialogDescription>
                Hang tight — we&rsquo;re saving everything viewers will see on
                the recap page.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              <Progress value={progress} className="w-full">
                <ProgressTrack className="w-full">
                  <ProgressIndicator />
                </ProgressTrack>
                <ProgressValue />
              </Progress>

              <ul className="flex flex-col gap-2">
                {ENDING_STEPS.map((label, i) => {
                  const done = i < endingStep;
                  const active = i === endingStep;
                  return (
                    <li
                      key={label}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      {done ? (
                        <span className="size-4 rounded-full bg-primary/15 text-center text-[10px] leading-4 text-primary">
                          ✓
                        </span>
                      ) : active ? (
                        <Loader2 className="size-4 animate-spin text-foreground" />
                      ) : (
                        <span className="size-4 rounded-full border border-border" />
                      )}
                      <span
                        className={
                          done || active ? "text-foreground" : undefined
                        }
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>End this show?</DialogTitle>
              <DialogDescription>
                Viewers will see the recap page with the full recording and
                shopping trail. You can&rsquo;t go live again on this link.
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
                onClick={() => onOpenChange(false)}
              >
                Keep streaming
              </Button>
              <Button
                type="button"
                variant="live"
                onClick={onConfirm}
              >
                End show
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ENDING_STEPS };
