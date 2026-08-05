import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminNav({
  pendingWaitlist = 0,
  active,
}: {
  pendingWaitlist?: number;
  active?: "panel" | "metrics" | "waitlist" | "outreach";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/admin"
        className={cn(
          buttonVariants({
            variant: active === "panel" ? "default" : "outline",
            size: "sm",
          }),
        )}
      >
        Live show panel
      </Link>
      <Link
        href="/admin/metrics"
        className={cn(
          buttonVariants({
            variant: active === "metrics" ? "default" : "outline",
            size: "sm",
          }),
        )}
      >
        Metrics
      </Link>
      <Link
        href="/admin/waitlist"
        className={cn(
          buttonVariants({
            variant: active === "waitlist" ? "default" : "outline",
            size: "sm",
          }),
          "inline-flex items-center gap-2",
        )}
      >
        Waitlist
        {pendingWaitlist > 0 ? (
          <Badge variant="live" size="micro">
            {pendingWaitlist} pending
          </Badge>
        ) : null}
      </Link>
      <Link
        href="/admin/creator-outreach"
        className={cn(
          buttonVariants({
            variant: active === "outreach" ? "default" : "outline",
            size: "sm",
          }),
        )}
      >
        Creator outreach
      </Link>
    </div>
  );
}
