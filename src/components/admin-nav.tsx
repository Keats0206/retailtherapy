import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminTab = "panel" | "metrics" | "waitlist" | "outreach";

export function AdminNav({
  pendingWaitlist = 0,
  active,
  onTabChange,
}: {
  pendingWaitlist?: number;
  active: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}) {
  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: "panel", label: "Live show panel" },
    { id: "metrics", label: "Metrics" },
    { id: "waitlist", label: "Waitlist" },
    { id: "outreach", label: "Creator outreach" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          variant={active === tab.id ? "default" : "outline"}
          size="sm"
          aria-current={active === tab.id ? "page" : undefined}
          className={cn(tab.id === "waitlist" && "inline-flex items-center gap-2")}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.id === "waitlist" && pendingWaitlist > 0 ? (
            <Badge variant="live" size="micro">
              {pendingWaitlist} pending
            </Badge>
          ) : null}
        </Button>
      ))}
    </div>
  );
}
