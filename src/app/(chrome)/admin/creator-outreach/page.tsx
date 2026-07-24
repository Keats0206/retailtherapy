import Link from "next/link";
import { notFound } from "next/navigation";

import { CreatorOutreachClient } from "@/components/creator-outreach-client";
import { buttonVariants } from "@/components/ui/button";
import { getAdminUser } from "@/lib/auth";
import { countProspectsByStatus, listProspects } from "@/lib/creator-outreach";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Creator outreach — frontrow",
};

export default async function CreatorOutreachPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();

  const [prospects, counts] = await Promise.all([
    listProspects(),
    countProspectsByStatus(),
  ]);

  // Surfaced in the UI so it's obvious whether a "Send" actually mails anyone.
  const dryRun = ["1", "true"].includes(
    process.env.OUTREACH_DRY_RUN?.trim().toLowerCase() ?? "",
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-24">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="micro text-muted-foreground">Admin</span>
          <h1 className="text-2xl font-normal leading-snug tracking-tight">
            Creator outreach
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Search TikTok for creators in a niche, pull the ones who publish a
            contact address in their bio, and write them a first-touch invite.
            Drafts are always yours to edit before anything sends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Live show panel
          </Link>
        </div>
      </div>

      <CreatorOutreachClient
        initialProspects={prospects}
        initialCounts={counts}
        dryRun={dryRun}
      />
    </main>
  );
}
