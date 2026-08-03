"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShowWrapUpSteps } from "@/components/show-wrap-up-steps";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

const ENDING_STEPS = [
  { id: "broadcast", label: "Broadcast stopped" },
  { id: "trail", label: "Shopping trail saved" },
  { id: "recording", label: "Recording packaged", pending: "Packaging recording" },
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
  const steps = ENDING_STEPS.map((step, i) => ({
    ...step,
    done: i < endingStep,
    active: i === endingStep,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!ending) onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!ending} className="rounded-none">
        {ending ? (
          <>
            <DialogHeader>
              <DialogTitle>Ending your show</DialogTitle>
              <DialogDescription>
                Hang tight — we&rsquo;re saving everything viewers will see on
                the recap page.
              </DialogDescription>
            </DialogHeader>

            <ShowWrapUpSteps steps={steps} className="py-2" />
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

            <DialogFooter className="rounded-none">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Keep streaming
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  trackEvent(AnalyticsEvent.HOST_END_SHOW, {
                    area: "host_studio",
                  });
                  onConfirm();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
