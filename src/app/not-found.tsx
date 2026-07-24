import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-2xl font-normal tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        That page doesn&rsquo;t exist or may have been removed.
      </p>
      <Button variant="outline" className="w-fit" render={<Link href="/" />}>
        Go home
      </Button>
    </main>
  );
}
