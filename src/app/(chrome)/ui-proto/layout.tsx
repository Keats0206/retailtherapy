"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function UiProtoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const watching = pathname.startsWith("/ui-proto/show/");
  const hosting = pathname.startsWith("/ui-proto/go-live");
  const subpage = watching || hosting;

  const contextLabel = hosting
    ? "Hosting"
    : watching
      ? "Watching"
      : "Homepage";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" size="micro">
            UI Proto
          </Badge>
          {subpage ? (
            <Link href="/ui-proto">
              <Button variant="ghost" size="micro">
                ← Home
              </Button>
            </Link>
          ) : (
            <Link href="/ui-proto/go-live">
              <Button variant="outline" size="micro">
                Go live
              </Button>
            </Link>
          )}
        </div>
        <span className="micro text-muted-foreground">{contextLabel}</span>
      </div>
      {children}
    </div>
  );
}
