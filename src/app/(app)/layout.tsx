import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { isAdmin } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = await isAdmin();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppShell isAdmin={admin}>{children}</AppShell>
    </div>
  );
}
