"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Clapperboard, Shield } from "lucide-react";

import { UserMenu } from "@/components/user-menu";
import { HostCtaButton } from "@/components/host-cta-button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

const APP_NAV: NavItem[] = [
  {
    href: "/your-shows",
    label: "Your shows",
    icon: Clapperboard,
    match: (pathname) => pathname.startsWith("/your-shows"),
  },
  {
    href: "/saved",
    label: "Saved",
    icon: Bookmark,
    match: (pathname) => pathname.startsWith("/saved"),
  },
];

function NavLink({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-sm transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0 sm:hidden" /> : null}
      {label}
    </Link>
  );
}

export function AppHeader({
  isAdmin = false,
  canHost = false,
}: {
  isAdmin?: boolean;
  canHost?: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:gap-4 sm:px-6">
      <Link
        href="/browse"
        className="shrink-0 font-brand text-xl uppercase tracking-[0.12em]"
      >
        frontrow
      </Link>

      <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
        <nav
          className="flex min-w-0 items-center gap-0.5 overflow-x-auto"
          aria-label="App"
        >
          {APP_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.match?.(pathname) ?? pathname === item.href}
            />
          ))}

          {isAdmin ? (
            <NavLink
              href="/admin"
              label="Admin"
              icon={Shield}
              active={pathname.startsWith("/admin")}
            />
          ) : null}
        </nav>

        <HostCtaButton
          variant="live"
          size="sm"
          className="shrink-0"
          canHost={canHost}
          area="header"
          showIcon
        />
        <UserMenu />
      </div>
    </header>
  );
}
