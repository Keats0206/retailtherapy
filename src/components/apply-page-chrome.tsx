import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export function ApplyPageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-brand text-xl uppercase tracking-[0.12em]">
            frontrow
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="micro"
              className="hidden sm:inline-flex"
              render={<Link href="/browse" />}
            >
              Browse shows
            </Button>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" size="micro">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="micro">Get started</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button variant="ghost" size="micro" render={<Link href="/home" />}>
                App
              </Button>
              <UserMenu />
            </Show>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
          <span className="micro text-muted-foreground">frontrow</span>
          <Link
            href="/browse"
            className="micro text-muted-foreground transition-colors hover:text-foreground"
          >
            Browse shows
          </Link>
        </div>
      </footer>
    </div>
  );
}
