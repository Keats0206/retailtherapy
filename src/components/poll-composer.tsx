"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  emojiFor,
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  type PollInput,
} from "@/lib/poll-store";

const PRESETS: { chip: string; input: PollInput }[] = [
  {
    chip: "🙌 Yay / 👎 Nay",
    input: {
      question: "Yay or nay?",
      options: [
        { label: "Yay", emoji: "🙌" },
        { label: "Nay", emoji: "👎" },
      ],
    },
  },
  {
    chip: "✅ Yes / ❌ No",
    input: {
      question: "Yes or no?",
      options: [
        { label: "Yes", emoji: "✅" },
        { label: "No", emoji: "❌" },
      ],
    },
  },
  {
    chip: "🛒 Buy / 🙅 Skip",
    input: {
      question: "Should we buy it?",
      options: [
        { label: "Buy", emoji: "🛒" },
        { label: "Skip", emoji: "🙅" },
      ],
    },
  },
];

/**
 * The host's quick vote builder: preset chips launch in one tap; the custom
 * path is a question plus 2–4 options with auto-assigned emojis, previewed
 * beside each input so nothing is a surprise at launch.
 */
export function PollComposer({
  open,
  onOpenChange,
  onLaunch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunch: (input: PollInput) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  const canLaunch =
    question.trim().length > 0 &&
    options.filter((o) => o.trim()).length >= MIN_POLL_OPTIONS;

  function launch(input: PollInput) {
    onLaunch(input);
    onOpenChange(false);
    setQuestion("");
    setOptions(["", ""]);
  }

  function launchCustom() {
    if (!canLaunch) return;
    launch({
      question: question.trim(),
      options: options
        // Emoji from the row index, matching the preview even when a blank
        // row sits between filled ones.
        .map((label, i) => ({
          label: label.trim(),
          emoji: emojiFor(label.trim(), i),
        }))
        .filter((o) => o.label),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a vote</DialogTitle>
          <DialogDescription>
            Launch a preset with one tap, or write your own. Viewers get 10
            seconds.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            launchCustom();
          }}
        >
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset.chip}
                type="button"
                size="micro"
                variant="outline"
                onClick={() => launch(preset.input)}
              >
                {preset.chip}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="micro text-muted-foreground">or custom</span>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should we shop next?"
            />

            {options.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center text-base">
                  {emojiFor(label.trim(), i)}
                </span>
                <Input
                  value={label}
                  onChange={(e) =>
                    setOptions((prev) =>
                      prev.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > MIN_POLL_OPTIONS && (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove option ${i + 1}`}
                    onClick={() =>
                      setOptions((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    <X />
                  </Button>
                )}
              </div>
            ))}

            {options.length < MAX_POLL_OPTIONS && (
              <Button
                type="button"
                size="micro"
                variant="ghost"
                className="self-start"
                onClick={() => setOptions((prev) => [...prev, ""])}
              >
                <Plus data-icon="inline-start" />
                Add option
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canLaunch}>
              Start vote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
