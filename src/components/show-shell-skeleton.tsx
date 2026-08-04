import { Loader2, MessageSquare, Plus, ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-none bg-muted/80", className)}
      aria-hidden
    />
  );
}

function ShellStatus({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2",
        className,
      )}
    >
      <Loader2 className="size-5 animate-spin text-white/50" aria-hidden />
      <p className="micro text-white/40">{label}</p>
    </div>
  );
}

function TrailStripSkeleton() {
  return (
    <div className="flex min-h-0 max-h-72 shrink-0 flex-col border-t border-border bg-background lg:max-h-80">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2.5">
        <Pulse className="h-4 w-28" />
        <Pulse className="h-5 w-8 rounded-none" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Pulse className="size-12 shrink-0 rounded-none" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Pulse className="h-3.5 w-3/5" />
              <Pulse className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchRailSkeleton() {
  return (
    <aside className="studio-rail flex min-h-0 w-full shrink-0 flex-col border-border max-lg:h-72 max-lg:shrink-0 max-lg:border-t lg:w-80 lg:border-l xl:w-96">
      <div className="flex shrink-0 border-b border-border/60">
        {[MessageSquare, ShoppingCart].map((Icon, i) => (
          <div
            key={i}
            className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2"
          >
            <Icon className="size-3.5 text-muted-foreground/50" aria-hidden />
            <Pulse className="h-3 w-10" />
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <Pulse className="size-6 shrink-0 rounded-none" />
            <Pulse className="h-8 flex-1 rounded-none" />
          </div>
        ))}
        <div className="mt-auto flex gap-2 pt-2">
          <Pulse className="h-10 flex-1 rounded-none" />
          <Pulse className="size-10 shrink-0 rounded-none" />
        </div>
      </div>
    </aside>
  );
}

function RailSkeleton({ host }: { host?: boolean }) {
  return (
    <aside className="studio-rail flex min-h-0 w-full shrink-0 flex-col lg:w-80 xl:w-96">
      <div className="flex min-h-0 flex-[3] flex-col overflow-hidden border-b border-border/60">
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
          {host ? (
            <>
              <Plus className="size-4 text-muted-foreground/50" aria-hidden />
              <span className="text-sm font-medium text-muted-foreground/50">
                Add
              </span>
            </>
          ) : (
            <Pulse className="h-4 w-16" />
          )}
        </div>
        <div className="flex flex-col gap-3 p-4">
          <Pulse className="h-3 w-2/3" />
          {host ? (
            <>
              <div className="flex gap-2">
                <Pulse className="h-8 w-20 rounded-none" />
                <Pulse className="h-8 w-20 rounded-none" />
              </div>
              <Pulse className="h-10 w-full rounded-none" />
              <Pulse className="h-11 w-full rounded-none" />
            </>
          ) : (
            <>
              <Pulse className="h-24 w-full rounded-none" />
              <Pulse className="h-10 w-full rounded-none" />
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-[2] flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
          <MessageSquare
            className="size-4 text-muted-foreground/50"
            aria-hidden
          />
          <span className="text-sm font-medium text-muted-foreground/50">
            Chat
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-2">
              <Pulse className="size-6 shrink-0 rounded-none" />
              <Pulse className="h-8 flex-1 rounded-none" />
            </div>
          ))}
          <div className="mt-auto flex gap-2 pt-2">
            <Pulse className="h-10 flex-1 rounded-none" />
            <Pulse className="size-10 shrink-0 rounded-none" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function StageSkeleton({
  statusLabel,
  className,
}: {
  statusLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-0 flex-1 bg-black max-lg:aspect-video max-lg:flex-none",
        className,
      )}
    >
      {statusLabel ? <ShellStatus label={statusLabel} /> : null}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
        <Pulse className="size-8 rounded-none bg-white/10" />
        <div className="flex items-center gap-2">
          <Pulse className="h-6 w-16 rounded-none bg-white/10" />
          <Pulse className="h-6 w-20 rounded-none bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/** Host studio shell — mirrors StudioLayout while LiveKit connects. */
export function StudioShellSkeleton({
  statusLabel = "Opening studio…",
  className,
}: {
  statusLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col lg:min-h-[calc(100vh-4.5rem)] lg:flex-row",
        className,
      )}
      aria-busy="true"
      aria-label={statusLabel}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <StageSkeleton statusLabel={statusLabel} />
        <TrailStripSkeleton />
      </div>
      <RailSkeleton host />
    </div>
  );
}

/** Viewer shell — mirrors WatchLayout while joining the room. */
export function WatchShellSkeleton({
  statusLabel = "Joining room…",
  title,
  hostName,
  className,
}: {
  statusLabel?: string;
  title?: string;
  hostName?: string | null;
  className?: string;
}) {
  return (
    <main
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      aria-busy="true"
      aria-label={statusLabel}
    >
      {(title || hostName) && (
        <div className="sr-only">
          {title}
          {hostName ? ` hosted by ${hostName}` : null}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <StageSkeleton statusLabel={statusLabel} />
        </div>
        <WatchRailSkeleton />
      </div>
    </main>
  );
}
