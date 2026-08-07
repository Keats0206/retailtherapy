import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { isAdmin, isHostingApproved } from "@/lib/auth";
import { hasOnboarded } from "@/lib/onboarding";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  // First run gets /welcome before anything else. Metadata read, no DB hit.
  if (user && !hasOnboarded(user)) redirect("/welcome");

  const [admin, canHost] = await Promise.all([
    isAdmin(),
    user ? isHostingApproved(user) : Promise.resolve(false),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppShell isAdmin={admin} canHost={canHost}>
        {children}
      </AppShell>
    </div>
  );
}
