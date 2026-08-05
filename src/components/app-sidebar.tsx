"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Calendar,
  Clapperboard,
  Home,
  Radio,
  Shield,
} from "lucide-react";

import { UserMenu } from "@/components/user-menu";
import { HostCtaButton } from "@/components/host-cta-button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "Home",
    icon: Home,
    match: (pathname) => pathname === "/home",
  },
  {
    href: "/home#live",
    label: "Live",
    icon: Radio,
  },
  {
    href: "/home#upcoming",
    label: "Upcoming",
    icon: Calendar,
  },
  {
    href: "/home#challenges",
    label: "Challenges",
    icon: Clapperboard,
  },
  {
    href: "/saved",
    label: "Saved",
    icon: Bookmark,
    match: (pathname) => pathname.startsWith("/saved"),
  },
];

export function AppSidebar({
  isAdmin = false,
  canHost = false,
}: {
  isAdmin?: boolean;
  canHost?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center px-5 py-5">
        <Link
          href="/home"
          className="font-brand text-xl uppercase tracking-[0.12em]"
        >
          frontrow
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.match?.(pathname) ?? pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin ? (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
              pathname.startsWith("/admin")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Shield className="size-4 shrink-0" />
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="flex flex-col gap-3 border-t border-sidebar-border p-4">
        <HostCtaButton
          size="sm"
          className="w-full"
          canHost={canHost}
          area="sidebar"
        />
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="micro text-muted-foreground">Account</span>
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}
