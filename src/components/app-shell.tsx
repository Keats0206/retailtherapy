"use client";

import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";

export function AppShell({
  children,
  isAdmin = false,
  canHost = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  canHost?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader isAdmin={isAdmin} canHost={canHost} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
