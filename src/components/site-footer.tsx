import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      data-site-chrome
      className="mt-auto flex w-full shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 px-6 py-5"
    >
      <span className="micro text-muted-foreground">
        &copy; {new Date().getFullYear()} frontrow
      </span>
      <Link
        href="/privacy"
        className="micro text-muted-foreground transition-colors hover:text-foreground"
      >
        Privacy
      </Link>
      <Link
        href="/terms"
        className="micro text-muted-foreground transition-colors hover:text-foreground"
      >
        Terms
      </Link>
    </footer>
  );
}
