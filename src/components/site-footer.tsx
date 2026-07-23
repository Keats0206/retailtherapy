export function SiteFooter() {
  return (
    <footer className="px-6 py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} frontrow</span>
        <a href="/privacy" className="hover:text-foreground hover:underline">
          Privacy
        </a>
        <a href="/terms" className="hover:text-foreground hover:underline">
          Terms
        </a>
      </div>
    </footer>
  );
}
