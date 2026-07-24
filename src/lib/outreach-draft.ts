import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import type { Prospect } from "@/lib/creator-outreach";

/**
 * Writes the first-touch recruiting email for one creator.
 *
 * The draft is grounded in that creator's actual bio and follower count so it
 * reads as though a person looked at their profile — which is the whole point.
 * Nothing here sends: the draft lands in the UI for an admin to edit, and
 * sending is a separate, explicit action.
 */

// Routed through the Vercel AI Gateway, so the provider is a string, not an
// imported SDK. Requires AI_GATEWAY_API_KEY locally; on Vercel, OIDC covers it.
const MODEL = "anthropic/claude-sonnet-5";

const draftSchema = z.object({
  subject: z
    .string()
    .describe("Subject line, under 60 characters, no emoji, no clickbait."),
  body: z
    .string()
    .describe(
      "Plain-text email body, 90-130 words, including a sign-off placeholder.",
    ),
});

export type OutreachDraft = z.infer<typeof draftSchema>;

export type DraftContext = {
  /** Who the email is from, e.g. "Pete, frontrow". */
  senderName: string;
  /** Optional extra steer from the admin, e.g. "mention the March cohort". */
  angle?: string | null;
};

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return String(count);
}

const SYSTEM_PROMPT = `You write short recruiting emails for frontrow, an invite-only live shopping platform where creators go live from their browser, pin products they love, and earn commission when viewers buy.

Rules:
- Write like one person emailing another, not like marketing. No "I hope this finds you well", no "I wanted to reach out", no exclamation marks.
- Open with something specific and true from their bio or niche. If the bio is thin, say something honest about their niche instead of inventing detail.
- Never invent numbers, past collaborations, or facts about them beyond what you are given.
- One clear ask: a short reply if they want an invite. No calendar links, no attachments.
- End with the sender's name on its own line. Do not add a subject line to the body.
- Plain text only. No markdown, no bullet lists.`;

export async function draftOutreachEmail(
  prospect: Prospect,
  context: DraftContext,
): Promise<OutreachDraft> {
  const profile = [
    `Handle: @${prospect.handle}`,
    prospect.displayName ? `Name shown: ${prospect.displayName}` : null,
    `Followers: ${formatFollowers(prospect.followerCount)}`,
    prospect.bio ? `Bio: ${prospect.bio}` : "Bio: (empty)",
    prospect.bioLink ? `Link in bio: ${prospect.bioLink}` : null,
    prospect.discoveredVia
      ? `Found via search for: ${prospect.discoveredVia}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: MODEL,
    schema: draftSchema,
    system: SYSTEM_PROMPT,
    prompt: [
      `Write a first-touch email to this TikTok creator inviting them to host on frontrow.`,
      ``,
      profile,
      ``,
      `Sign off as: ${context.senderName}`,
      context.angle ? `Angle to work in: ${context.angle}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n"),
  });

  return object;
}
