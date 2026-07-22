import { config } from "dotenv";
import { randomBytes } from "node:crypto";

config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import Mux from "@mux/mux-node";

const SLUG_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

function generateSlug(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const byte of bytes) out += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  return out;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  const baseUrl = process.env.SMOKE_TEST_BASE_URL ?? "http://localhost:3000";

  if (!databaseUrl || !tokenId || !tokenSecret) {
    throw new Error("Missing DATABASE_URL or Mux credentials in .env.local");
  }

  const mux = new Mux({ tokenId, tokenSecret });
  const { liveStreamId, streamKey } = await (async () => {
    const liveStream = await mux.video.liveStreams.create({
      playback_policy: ["public"],
      new_asset_settings: { playback_policy: ["public"] },
    });
    return {
      liveStreamId: liveStream.id,
      streamKey: liveStream.stream_key!,
    };
  })();

  const slug = generateSlug();
  const title = "Smoke Test Show";
  const sql = neon(databaseUrl);

  await sql`
    INSERT INTO streams (
      slug, title, host_user_id, host_name, status, room_name,
      mux_live_stream_id, mux_stream_key, snapshot, started_at
    ) VALUES (
      ${slug}, ${title}, ${"smoke-test-user"}, ${"Smoke Test Host"}, ${"live"},
      ${`show_${slug}`}, ${liveStreamId}, ${streamKey}, ${JSON.stringify({ trail: [], pinnedId: null, votes: {} })}::jsonb,
      ${new Date().toISOString()}
    )
  `;

  const [row] = await sql`SELECT slug, title, status FROM streams WHERE slug = ${slug}`;
  console.log("DB row:", row);

  const apiRes = await fetch(`${baseUrl}/api/shows?status=live`);
  if (!apiRes.ok) throw new Error(`API ${apiRes.status}: ${await apiRes.text()}`);
  const apiJson = (await apiRes.json()) as { shows: { slug: string; title: string }[] };
  const inApi = apiJson.shows.some((s) => s.slug === slug);
  console.log("API listLiveShows:", inApi, `(${apiJson.shows.length} live)`);

  const browseRes = await fetch(`${baseUrl}/browse`);
  if (!browseRes.ok) throw new Error(`Browse ${browseRes.status}`);
  const browseHtml = await browseRes.text();
  const inBrowse = browseHtml.includes(slug) && browseHtml.includes(title);
  console.log("Browse page includes show:", inBrowse);

  if (!row || !inApi || !inBrowse) {
    throw new Error("Smoke test failed — show not visible end-to-end");
  }

  console.log("Smoke test passed:", slug);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
