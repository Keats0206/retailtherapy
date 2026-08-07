import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin-access-denied";
import { AdminNav } from "@/components/admin-nav";
import { AdminWaitlistClient } from "@/components/admin-waitlist-client";
import { getAdminAccess } from "@/lib/auth";
import { countPendingWaitlistSignups, listWaitlistSignups } from "@/lib/host-approvals";

export const metadata = {
  title: "Waitlist — frontrow",
};

export default async function AdminWaitlistPage() {
  const access = await getAdminAccess();
  if (access.status === "unauthenticated") notFound();
  if (access.status === "denied") {
    return (
      <AdminAccessDenied
        username={access.username}
        emails={access.emails}
      />
    );
  }

  const [{ signups, counts }, pendingWaitlist] = await Promise.all([
    listWaitlistSignups(),
    countPendingWaitlistSignups(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-24">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="micro text-muted-foreground">Admin</span>
          <h1 className="text-2xl font-normal leading-snug tracking-tight">
            Creator waitlist
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Applications from /creators and /apply land here. Approve to grant
            hosting — they&rsquo;ll see Go live across the app. Decline to keep
            them on the waitlist.
          </p>
        </div>

        <AdminNav active="waitlist" pendingWaitlist={pendingWaitlist} />
      </div>

      <AdminWaitlistClient initialSignups={signups} initialCounts={counts} />
    </main>
  );
}
