import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Editorial panel — the Card primitive with spacing and borders tuned for this
 * app's shopping surfaces. Use this instead of overriding Card in every file.
 */
function Panel({
  className,
  accent = false,
  ...props
}: React.ComponentProps<"div"> & { accent?: boolean }) {
  return (
    <div
      data-slot="panel"
      className={cn(
        "flex flex-col gap-3 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
        accent && "border border-primary/30 bg-primary/5 ring-0",
        className,
      )}
      {...props}
    />
  )
}

function PanelHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 px-4 has-data-[slot=panel-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  )
}

function PanelTitle({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & { tone?: "default" | "muted" }) {
  return (
    <div
      data-slot="panel-title"
      className={cn(
        tone === "muted"
          ? "micro text-muted-foreground"
          : "text-sm font-medium text-foreground",
        className,
      )}
      {...props}
    />
  )
}

function PanelAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  )
}

function PanelContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-content"
      className={cn("px-4", className)}
      {...props}
    />
  )
}

export { Panel, PanelHeader, PanelTitle, PanelAction, PanelContent }
