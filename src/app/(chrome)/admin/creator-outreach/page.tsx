import Link from "next/link";

import { CreatorOutreachClient } from "@/components/creator-outreach-client";
import { buttonVariants } from "@/components/ui/button";
import { countProspectsByStatus, listProspects } from "@/lib/creator-outreach";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Creator outreach — frontrow",
};

// Ungated while we're still shaping this tool — anyone who knows the URL can
// open it. Re-add the `getAdminUser()` check before this ships publicly.
export default async function CreatorOutreachPage() {
  const [prospects, counts] = await Promise.all([
    listProspects(),
    countProspectsByStatus(),
  ]);

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
            Drafts open in your own Gmail, so you review and send every one by
            hand.
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
      />
    </main>
  );
}
