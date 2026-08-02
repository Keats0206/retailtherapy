import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChallengePage } from "@/components/challenge-page";
import { getChallengeBySlug } from "@/lib/challenges";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  if (!challenge) return { title: "Challenge — frontrow" };

  return {
    title: `${challenge.title} — frontrow`,
    description: challenge.prompt,
  };
}

/**
 * One sponsored event: the brief, who is attempting it right now, and the
 * recaps of everyone who already has. The Take it button hands off to host
 * setup with `?challenge=<slug>`, which is what attaches the resulting show
 * back to this page.
 */
export default async function ChallengeRoute({ params }: Params) {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  if (!challenge) notFound();

  return <ChallengePage challenge={challenge} />;
}
