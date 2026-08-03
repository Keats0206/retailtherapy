import { cn } from "@/lib/utils";

/** The deal, in three beats — same for every challenge, so it lives here. */
const STEPS = [
  {
    title: "Apply and get accepted",
    detail: "Take the challenge and we confirm you before you go on air.",
  },
  {
    title: "Run a show, 30 minutes minimum",
    detail: "Shop the brief live and add every link as you go.",
  },
  {
    title: "Share it with your followers",
    detail: "Promote clips before and after — that's what fills the room.",
  },
] as const;

/**
 * What taking a challenge actually involves. Shown on the home page above the
 * challenge grid and on each challenge page above the brief — hosts ask "what
 * am I signing up for" before they read the brand's pitch.
 */
export function ChallengeSteps({ className }: { className?: string }) {
  return (
    <ol
      className={cn(
        "grid gap-4 bg-muted p-6 sm:grid-cols-3 sm:p-7",
        className,
      )}
    >
      {STEPS.map((step, i) => (
        <li key={step.title} className="flex flex-col gap-1.5">
          <span className="micro flex size-6 items-center justify-center rounded-full bg-foreground tabular-nums text-background">
            {i + 1}
          </span>
          <span className="text-sm font-medium">{step.title}</span>
          <span className="text-sm leading-relaxed text-muted-foreground">
            {step.detail}
          </span>
        </li>
      ))}
    </ol>
  );
}
