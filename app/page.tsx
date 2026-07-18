import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CREATOR_HANDLE } from "@/lib/mock-data";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex flex-col gap-3">
        <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
          Live shopping, prototype
        </span>
        <h1 className="text-4xl font-semibold tracking-tight">
          Watch someone shop. Buy what they find.
        </h1>
        <p className="text-balance text-muted-foreground">
          Creators go live browsing products. You chat, vote Buy or Skip, and shop the
          picks — every stream becomes a shoppable replay.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" render={<Link href={`/${CREATOR_HANDLE}`} />}>
          Enter the channel
        </Button>
        <Button
          size="lg"
          variant="outline"
          render={<Link href={`/${CREATOR_HANDLE}/studio`} />}
        >
          Open creator studio
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: open the channel and the studio in two windows to see it sync live.
      </p>
    </main>
  );
}
