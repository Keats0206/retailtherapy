import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";

/**
 * Seeds the curated challenge events shown on /browse.
 *
 * Challenges are brand-sponsored launch events — a budget, a clock and a store
 * ("15 minutes to spend $500 at Net-a-Porter") — and there is no admin UI for
 * them yet, so this script is how they get created and edited. Re-runnable:
 * rows upsert on `slug`, so changing copy here and re-running updates in place
 * rather than duplicating. Attempts already recorded against an event keep
 * pointing at it, since the id is preserved.
 *
 *   npx tsx scripts/seed-challenges.ts
 */

/** Days from now, at a fixed local hour — keeps the seeded schedule plausible. */
function inDays(days: number, hour = 19): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

const CHALLENGES = [
  {
    slug: "net-a-porter-500",
    title: "15 minutes to spend $500 at Net-a-Porter",
    prompt:
      "The clock starts when you go live. Fill a $500 cart from Net-a-Porter before it runs out — the room votes on every pick, and whatever survives the vote is the look.",
    brandName: "Net-a-Porter",
    brandDomain: "net-a-porter.com",
    brandLogoUrl: "/challenges/net-a-porter.jpg",
    storeUrl: "https://www.net-a-porter.com",
    emoji: "👜",
    budgetCents: 500_00,
    durationSeconds: 15 * 60,
    startsAt: null, // Open now — the flagship event.
    endsAt: null,
    sortOrder: 0,
  },
  {
    slug: "glossier-150-beauty-run",
    title: "$150 Glossier beauty run in 10 minutes",
    prompt:
      "One routine, ten minutes, $150. Build a full face from Glossier and defend every add to the room before the timer kills the cart.",
    brandName: "Glossier",
    brandDomain: "glossier.com",
    brandLogoUrl: "/challenges/glossier.jpg",
    storeUrl: "https://www.glossier.com",
    emoji: "💄",
    budgetCents: 150_00,
    durationSeconds: 10 * 60,
    startsAt: null,
    endsAt: null,
    sortOrder: 1,
  },
  {
    slug: "ssense-750-drop",
    title: "$750 at SSENSE, 20 minutes, no basics",
    prompt:
      "Nothing plain allowed. Twenty minutes to spend $750 at SSENSE on pieces the room would actually stop scrolling for — a single white tee ends the run.",
    brandName: "SSENSE",
    brandDomain: "ssense.com",
    brandLogoUrl: "/challenges/ssense.jpg",
    storeUrl: "https://www.ssense.com",
    emoji: "🧥",
    budgetCents: 750_00,
    durationSeconds: 20 * 60,
    startsAt: inDays(2),
    endsAt: inDays(3),
    sortOrder: 0,
  },
  {
    slug: "goop-300-wellness",
    title: "$300 of goop in 12 minutes",
    prompt:
      "Twelve minutes, $300, and a shelf to fill. Talk the room through what's worth it and what is very much not.",
    brandName: "goop",
    brandDomain: "goop.com",
    brandLogoUrl: "/challenges/goop.jpg",
    storeUrl: "https://goop.com",
    emoji: "🕯️",
    budgetCents: 300_00,
    durationSeconds: 12 * 60,
    startsAt: inDays(5),
    endsAt: inDays(6),
    sortOrder: 0,
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set — add it to .env.local");
  }

  const sql = neon(databaseUrl);

  for (const challenge of CHALLENGES) {
    await sql`
      insert into challenges (
        slug, title, prompt, brand_name, brand_domain, brand_logo_url, store_url,
        emoji, budget_cents, duration_seconds, starts_at, ends_at, sort_order,
        is_active
      ) values (
        ${challenge.slug}, ${challenge.title}, ${challenge.prompt},
        ${challenge.brandName}, ${challenge.brandDomain}, ${challenge.brandLogoUrl},
        ${challenge.storeUrl}, ${challenge.emoji}, ${challenge.budgetCents},
        ${challenge.durationSeconds}, ${challenge.startsAt}, ${challenge.endsAt},
        ${challenge.sortOrder}, true
      )
      on conflict (slug) do update set
        title = excluded.title,
        prompt = excluded.prompt,
        brand_name = excluded.brand_name,
        brand_domain = excluded.brand_domain,
        brand_logo_url = excluded.brand_logo_url,
        store_url = excluded.store_url,
        emoji = excluded.emoji,
        budget_cents = excluded.budget_cents,
        duration_seconds = excluded.duration_seconds,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        sort_order = excluded.sort_order,
        is_active = true,
        updated_at = now()
    `;
    console.log(`✓ ${challenge.slug}`);
  }

  console.log(`\nSeeded ${CHALLENGES.length} challenges.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
