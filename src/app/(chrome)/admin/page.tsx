import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin-access-denied";
import { AdminShell, parseAdminTab } from "@/components/admin-shell";
import { getAdminAccess, isSuperAdmin } from "@/lib/auth";
import { countPendingWaitlistSignups } from "@/lib/host-approvals";
import { parseRange } from "@/lib/metrics";
import { listLiveShowsForAdmin, listPastShowsForAdmin } from "@/lib/shows";

export const metadata = {
  title: "Admin — frontrow",
};

function serializeShows<T extends { startedAt: Date | null; endedAt: Date | null; createdAt: Date; updatedAt: Date }>(
  shows: T[],
) {
  return shows.map((show) => ({
    ...show,
    startedAt: show.startedAt?.toISOString() ?? null,
    endedAt: show.endedAt?.toISOString() ?? null,
    createdAt: show.createdAt.toISOString(),
    updatedAt: show.updatedAt.toISOString(),
  }));
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

  const params = await searchParams;
  const initialTab = parseAdminTab(params.tab);
  const initialMetricsRange = parseRange(params.range);

  const admin = access.user;

  const [liveShows, pastShows, pendingWaitlist] = await Promise.all([
    listLiveShowsForAdmin(),
    listPastShowsForAdmin(),
    countPendingWaitlistSignups(),
  ]);

  const adminLabel =
    admin.username ??
    admin.firstName ??
    admin.emailAddresses[0]?.emailAddress ??
    "Admin";

  return (
    <AdminShell
      initialTab={initialTab}
      initialMetricsRange={initialMetricsRange}
      adminLabel={adminLabel}
      superAdmin={isSuperAdmin(admin)}
      pendingWaitlist={pendingWaitlist}
      panelData={{
        liveShows: serializeShows(liveShows),
        pastShows: serializeShows(pastShows),
      }}
    />
  );
}
