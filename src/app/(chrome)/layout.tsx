import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";

import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

/**
 * The site header, for every route except `/watch`.
 *
 * Watch is deliberately outside this group: it runs full-bleed with the video
 * filling the viewport, and a persistent header would both eat vertical space
 * and break the theatre framing. This is a nested layout under the real root
 * layout (not a second root layout), so moving between here and /watch is still
 * a client-side transition.
 */
export default function ChromeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="text-base font-bold uppercase tracking-widest">
          Retail Therapy
        </Link>
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost" size="micro">
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserMenu />
          </Show>
        </div>
      </header>
      {/* The body is `overflow-hidden` so /watch can pin itself to the viewport,
          so ordinary pages need to scroll inside this container instead. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
        <SiteFooter />
      </div>
    </>
  );
}
