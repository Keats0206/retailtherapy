"use client";

import { HostCtaBlock } from "@/components/host-cta-block";
import { HostCreatorActions } from "@/components/host-creator-actions";
import { ShowCard } from "@/components/show-card";
import type { DiscoveryShow } from "@/lib/shows";

/**
 * Signed-in browse — the discovery feed: what's on now, what's coming, and
 * every recap. Shows you personally host live at `/your-shows`.
 */
export function BrowsePage({
  liveShows,
  upcomingShows = [],
  pastShows = [],
  isAdmin = false,
  canHost = false,
}: {
  liveShows: DiscoveryShow[];
  upcomingShows?: DiscoveryShow[];
  pastShows?: DiscoveryShow[];
  isAdmin?: boolean;
  canHost?: boolean;
}) {
  return (
    <main className="flex w-full flex-1 flex-col gap-10 px-4 py-6 sm:px-6 lg:gap-14 lg:py-10">
      {canHost ? (
        <section className="creator-promo flex flex-col items-center gap-3 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex max-w-lg flex-col gap-1.5">
            <p className="text-xl font-medium tracking-tight sm:text-2xl">
              Shop now.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Go live immediately or schedule ahead and share the waitroom link.
            </p>
          </div>
          <HostCreatorActions area="browse-creator" />
        </section>
      ) : (
        <section className="creator-promo flex flex-col items-center gap-3 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex max-w-lg flex-col gap-1.5">
            <p className="text-base font-medium tracking-tight">
              Shop live, get paid by brands.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Apply to host on frontrow — no app download, no studio setup.
            </p>
          </div>
          <HostCtaBlock canHost={false} area="browse-promo" showHook={false} className="sm:items-end" />
        </section>
      )}
      {liveShows.length > 0 ? (
        <Section
          id="live"
          title="Live now"
          eyebrow={
            <span className="inline-flex items-center gap-1.5 text-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              <span className="micro">{liveShows.length} on air</span>
            </span>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveShows.map((show) => (
              <ShowCard key={show.slug} show={show} isAdmin={isAdmin} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section
        id="upcoming"
        title="Upcoming shows"
        description="Scheduled shows you can wait for — you'll land in the waitroom until the host goes live."
      >
        {upcomingShows.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingShows.map((show) => (
              <ShowCard
                key={show.slug}
                show={show}
                variant="upcoming"
                area="browse"
              />
            ))}
          </div>
        ) : (
          <p className="empty-placeholder p-6 text-sm leading-relaxed text-muted-foreground">
            No shows scheduled yet. When hosts schedule ahead, they&rsquo;ll
            show up here.
          </p>
        )}
      </Section>

      <Section
        id="past"
        title="Past shows"
        description="Every recap, with the full trail of what the host actually bought."
      >
        {pastShows.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastShows.map((show) => (
              <ShowCard key={show.slug} show={show} variant="past" />
            ))}
          </div>
        ) : (
          <p className="empty-placeholder p-6 text-sm leading-relaxed text-muted-foreground">
            No finished shows yet.
          </p>
        )}
      </Section>
    </main>
  );
}

function Section({
  id,
  title,
  description,
  eyebrow,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-4 scroll-mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-medium tracking-tight sm:text-2xl">
          {title}
        </h2>
        {eyebrow}
      </div>
      {description ? (
        <p className="-mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
    </section>
  );
}

