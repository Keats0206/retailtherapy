import Link from "next/link";

import { Button } from "@/components/ui/button";

type AdminAccessDeniedProps = {
  username: string | null;
  emails: string[];
};

export function AdminAccessDenied({ username, emails }: AdminAccessDeniedProps) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-2xl font-normal tracking-tight">Admin access denied</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        You&apos;re signed in, but this Clerk account isn&apos;t on the admin
        allowlist. Admin access requires username{" "}
        <code className="text-foreground">keats0206</code> or one of these
        emails: <code className="text-foreground">keats0206@gmail.com</code>,{" "}
        <code className="text-foreground">leon@boldenadvisors.com</code>.
      </p>
      <div className="rounded-none bg-muted/40 p-4 text-sm ring-1 ring-foreground/10">
        <p className="micro text-muted-foreground">Signed in as</p>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="text-xs text-muted-foreground">Username</dt>
            <dd className="font-mono text-sm">{username ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Emails on account</dt>
            <dd className="font-mono text-sm">
              {emails.length > 0 ? emails.join(", ") : "None found"}
            </dd>
          </div>
        </dl>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        If the email above should have access, sign out and sign back in with
        that address, or add it to the built-in allowlist in{" "}
        <code className="text-foreground">src/lib/auth.ts</code>.
      </p>
      <Button variant="outline" className="w-fit" render={<Link href="/" />}>
        Go home
      </Button>
    </main>
  );
}
