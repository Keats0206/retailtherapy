import { config } from "dotenv";
import { randomBytes } from "node:crypto";

config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const SLUG_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

function generateSlug(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const byte of bytes) out += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  return out;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const baseUrl = process.env.SMOKE_TEST_BASE_URL ?? "http://localhost:3000";

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL in .env.local");
  }

  const slug = generateSlug();
  const title = "Schedule Smoke Test";
  const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const sql = neon(databaseUrl);

  const [inserted] = await sql`
    INSERT INTO streams (
      slug, title, host_user_id, host_name, status, room_name,
      snapshot, scheduled_for
    ) VALUES (
      ${slug}, ${title}, ${"smoke-schedule-user"}, ${"Smoke Host"}, ${"scheduled"},
      ${`show_${slug}`}, ${JSON.stringify({ trail: [], active: null, votes: {}, verseVotes: {} })}::jsonb,
      ${scheduledFor}
    )
    RETURNING id, slug
  `;

  console.log("Scheduled show created:", inserted);

  try {
    const interestGet = await fetch(`${baseUrl}/api/shows/${slug}/interest`);
    if (!interestGet.ok) {
      throw new Error(`GET interest ${interestGet.status}`);
    }
    const interestJson = (await interestGet.json()) as {
      total: number;
      registered: boolean;
    };
    console.log("GET interest:", interestJson);

    const interestPost = await fetch(`${baseUrl}/api/shows/${slug}/interest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "smoke-test@example.com" }),
    });
    if (!interestPost.ok) {
      throw new Error(`POST interest ${interestPost.status}`);
    }
    const postJson = (await interestPost.json()) as { total: number };
    console.log("POST interest:", postJson);
    if (postJson.total < 1) {
      throw new Error("Interest count did not increment");
    }

    const waitroomRes = await fetch(`${baseUrl}/waitroom/${slug}`);
    if (!waitroomRes.ok) {
      throw new Error(`Waitroom ${waitroomRes.status}`);
    }
    const waitroomHtml = await waitroomRes.text();
    const hasInterestUi =
      waitroomHtml.includes("I'm interested") ||
      waitroomHtml.includes("Get notified when it starts");
    console.log("Waitroom has interest UI:", hasInterestUi);
    if (!hasInterestUi) {
      throw new Error("Waitroom missing interest UI");
    }

    const upcomingRes = await fetch(`${baseUrl}/home`);
    console.log("Home page status:", upcomingRes.status);

    console.log("Schedule smoke test passed:", slug);
  } finally {
    await sql`DELETE FROM streams WHERE slug = ${slug}`;
    console.log("Cleaned up test show");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
