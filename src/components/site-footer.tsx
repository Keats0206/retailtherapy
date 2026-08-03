export function SiteFooter() {
  return (
    <footer className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-6 py-6 text-sm text-muted-foreground">
      <span>&copy; {new Date().getFullYear()} frontrow</span>
      <a href="/privacy" className="hover:text-foreground hover:underline">
        Privacy
      </a>
      <a href="/terms" className="hover:text-foreground hover:underline">
        Terms
      </a>
    </footer>
  );
}
