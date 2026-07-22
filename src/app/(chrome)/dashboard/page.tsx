import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listShowsForHost } from "@/lib/shows";
import { cn } from "@/lib/utils";

export default async function Dashboard() {
  const { userId } = await auth();
  const shows = userId ? await listShowsForHost(userId) : [];
  const liveShows = shows.filter((show) => show.status === "live");
  const pastShows = shows.filter((show) => show.status !== "live");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-24">
      <div className="flex flex-col gap-6">
        <span className="micro text-muted-foreground">Live shopping</span>
        <h1 className="max-w-xl text-2xl font-normal leading-snug tracking-tight">
          Hosts go live from the browser, pin what they&rsquo;re showing, and the
          room decides whether it&rsquo;s worth buying.
        </h1>
      </div>

      <div className="flex flex-col gap-6 border-t border-border pt-8">
        <Link
          href="/host"
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
        >
          Go live as host
        </Link>
        <p className="text-sm text-muted-foreground">
          Watching? Open the link your host sent you, or browse{" "}
          <Link href="/browse" className="text-foreground underline-offset-4 hover:underline">
            live shows
          </Link>
          .
        </p>
      </div>

      {liveShows.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="micro text-muted-foreground">Your live shows</h2>
          <div className="flex flex-col gap-3">
            {liveShows.map((show) => (
              <ShowRow key={show.id} show={show} />
            ))}
          </div>
        </section>
      ) : null}

      {pastShows.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="micro text-muted-foreground">Past shows</h2>
          <div className="flex flex-col gap-3">
            {pastShows.map((show) => (
              <ShowRow key={show.id} show={show} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ShowRow({
  show,
}: {
  show: Awaited<ReturnType<typeof listShowsForHost>>[number];
}) {
  const statusLabel =
    show.status === "live"
      ? "Live"
      : show.status === "ended"
        ? "Ended"
        : "Scheduled";

  return (
    <Card className="py-0 ring-foreground/8">
      <Link
        href={`/s/${show.slug}`}
        className="flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <CardHeader className="gap-2 pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base font-normal">{show.title}</CardTitle>
            <Badge
              variant={show.status === "live" ? "destructive" : "secondary"}
              size="micro"
              className={cn(
                show.status === "live" && "bg-live text-live-foreground",
              )}
            >
              {statusLabel}
            </Badge>
          </div>
          <CardDescription>
            /s/{show.slug}
            {show.startedAt
              ? ` · ${show.startedAt.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}`
              : null}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <span className="micro text-muted-foreground">
            {show.status === "live" ? "Open studio view" : "View recap"}
          </span>
        </CardFooter>
      </Link>
    </Card>
  );
}
