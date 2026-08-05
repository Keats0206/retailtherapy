import { ChallengeEventCard } from "@/components/challenge-card";
import { ChallengeSteps } from "@/components/challenge-steps";
import type { ChallengeCard as Challenge } from "@/lib/challenges";

export function ChallengesSection({
  challenges,
  id = "challenges",
}: {
  challenges: Challenge[];
  id?: string;
}) {
  const openChallenges = challenges.filter((entry) => entry.state === "open");
  const upcomingChallenges = challenges.filter(
    (entry) => entry.state === "upcoming",
  );

  return (
    <section id={id} className="flex flex-col gap-4 scroll-mt-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium tracking-tight sm:text-2xl">
          Challenges
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Brands set the budget and the brief. Hosts go live for at least 30
          minutes — you vote on every pick.
        </p>
      </div>

      <ChallengeSteps />

      {challenges.length === 0 ? (
        <p className="soft-panel p-6 text-sm leading-relaxed text-muted-foreground">
          No challenges are running right now. Check back soon — new brand events
          drop every week.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {openChallenges.length > 0 ? (
            <ChallengeGrid challenges={openChallenges} featureFirst />
          ) : null}

          {upcomingChallenges.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h3 className="micro text-muted-foreground">Coming up</h3>
              <ChallengeGrid
                challenges={upcomingChallenges}
                featureFirst={openChallenges.length === 0}
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ChallengeGrid({
  challenges,
  featureFirst = false,
}: {
  challenges: Challenge[];
  featureFirst?: boolean;
}) {
  const [first, ...rest] = challenges;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {featureFirst ? (
        <div className="col-span-2">
          <ChallengeEventCard challenge={first} featured />
        </div>
      ) : (
        <ChallengeEventCard challenge={first} />
      )}
      {rest.map((challenge) => (
        <ChallengeEventCard key={challenge.slug} challenge={challenge} />
      ))}
    </div>
  );
}
