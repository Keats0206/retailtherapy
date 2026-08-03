/**
 * Embed ended shows for semantic search.
 *
 * Usage:
 *   tsx --env-file=.env.local scripts/index-shows-for-search.ts
 *   tsx --env-file=.env.local scripts/index-shows-for-search.ts my-show-slug
 */

import { eq } from "drizzle-orm";

import { db, streams } from "../src/lib/db";
import { indexShowForSearch } from "../src/lib/show-search";

async function main() {
  const slugArg = process.argv[2];

  if (slugArg) {
    await indexShowForSearch(slugArg);
    console.log(`Indexed show: ${slugArg}`);
    return;
  }

  const ended = await db
    .select({ slug: streams.slug })
    .from(streams)
    .where(eq(streams.status, "ended"));

  let indexed = 0;
  let failed = 0;

  for (const { slug } of ended) {
    try {
      await indexShowForSearch(slug);
      indexed += 1;
      console.log(`Indexed: ${slug}`);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed: ${slug} — ${message}`);
    }
  }

  console.log(`Done. Indexed ${indexed}, failed ${failed}, total ${ended.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
