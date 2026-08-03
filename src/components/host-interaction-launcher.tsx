"use client";

import { useState } from "react";
import { Plus, Vote, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import {
  emojiFor,
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  YAY_NAY_POLL,
  type PollInput,
} from "@/lib/poll-store";
import { cn } from "@/lib/utils";

export function HostInteractionLauncher({
  onLaunch,
  className,
  variant = "rail",
}: {
  onLaunch: (input: PollInput) => void;
  className?: string;
  variant?: "rail" | "pip";
}) {
  const [showCustom, setShowCustom] = useState(false);
  const isPip = variant === "pip";

  function launch(input: PollInput) {
    trackEvent(AnalyticsEvent.HOST_POLL_LAUNCH, { area: "host_studio" });
    onLaunch(input);
    setShowCustom(false);
  }

  if (showCustom) {
    return (
      <CustomPollForm
        onBack={() => setShowCustom(false)}
        onLaunch={launch}
        className={className}
        isPip={isPip}
      />
    );
  }

  return (
    <div className={cn(isPip ? "p-3" : "p-4", className)}>
      <p className="mb-3 text-sm font-medium text-foreground">Launch for viewers</p>
      <div className="flex flex-col gap-2">
        <LauncherOption
          icon={<span className="text-base leading-none">🙌</span>}
          title="Yay / Nay"
          hint="Quick 10-second vote"
          onClick={() => launch(YAY_NAY_POLL)}
        />
        <LauncherOption
          icon={<Vote className="size-4" />}
          title="Make a poll"
          hint="Custom question and options"
          onClick={() => setShowCustom(true)}
        />
      </div>
    </div>
  );
}

function LauncherOption({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-none border border-border/60 bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function CustomPollForm({
  onBack,
  onLaunch,
  className,
  isPip,
}: {
  onBack: () => void;
  onLaunch: (input: PollInput) => void;
  className?: string;
  isPip: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  const canLaunch =
    question.trim().length > 0 &&
    options.filter((option) => option.trim()).length >= MIN_POLL_OPTIONS;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canLaunch) return;
    onLaunch({
      question: question.trim(),
      options: options
        .map((label, index) => ({
          label: label.trim(),
          emoji: emojiFor(label.trim(), index),
        }))
        .filter((option) => option.label),
    });
  }

  return (
    <div className={cn(isPip ? "p-3" : "p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Back"
          onClick={onBack}
        >
          <X className="size-4" />
        </Button>
        <h3 className="text-sm font-medium text-foreground">Make a poll</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What should we shop next?"
          aria-label="Poll question"
          className="h-9 text-sm"
        />

        {options.map((label, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span className="w-5 shrink-0 text-center text-sm">
              {emojiFor(label.trim(), index)}
            </span>
            <Input
              value={label}
              onChange={(event) =>
                setOptions((prev) =>
                  prev.map((value, optionIndex) =>
                    optionIndex === index ? event.target.value : value,
                  ),
                )
              }
              placeholder={`Option ${index + 1}`}
              aria-label={`Poll option ${index + 1}`}
              className="h-9 text-sm"
            />
            {options.length > MIN_POLL_OPTIONS ? (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label={`Remove option ${index + 1}`}
                onClick={() =>
                  setOptions((prev) =>
                    prev.filter((_, optionIndex) => optionIndex !== index),
                  )
                }
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ))}

        {options.length < MAX_POLL_OPTIONS ? (
          <Button
            type="button"
            size="micro"
            variant="ghost"
            className="self-start px-0"
            onClick={() => setOptions((prev) => [...prev, ""])}
          >
            <Plus data-icon="inline-start" />
            Add option
          </Button>
        ) : null}

        <Button type="submit" size="sm" disabled={!canLaunch} className="mt-1">
          Start vote
        </Button>
      </form>
    </div>
  );
}
