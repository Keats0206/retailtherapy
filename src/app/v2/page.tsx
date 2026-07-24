import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "v2",
};

export default function V2Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">v2</h1>
      <p className="text-muted-foreground">This is the v2 page.</p>
    </main>
  );
}
