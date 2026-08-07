"use client";

import { Menu } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
    <div className="flex min-h-0 flex-1">
      <div className="hidden w-56 shrink-0 lg:block">
        <AppSidebar isAdmin={isAdmin} canHost={canHost} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <AppSidebar isAdmin={isAdmin} canHost={canHost} />
            </SheetContent>
          </Sheet>
          <span className="font-brand text-lg uppercase tracking-[0.12em]">
            frontrow
          </span>
          <div className="w-9" />
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
