import "server-only";

import { embed } from "ai";
import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db, streams, type Stream } from "@/lib/db";
import { getShowBySlug, snapshotOf } from "@/lib/shows";
import type { ShowSetup } from "@/lib/show-setup";
import type { StreamSnapshot } from "@/lib/stream-store";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIM = 1536;

export type SearchResult = {
  slug: string;
  title: string;
  hostName: string | null;
  score: number;
};

function setupLines(setup: ShowSetup | null | undefined): string[] {
  if (!setup) return [];

  const lines = [`Intent: ${setup.intent}`];
  if (setup.detail) lines.push(`Focus: ${setup.detail}`);
  if (setup.items.length > 0) {
    lines.push(`Shopping for: ${setup.items.join(", ")}`);
  }
  return lines;
}

/** Build a plain-text document from show metadata and the frozen trail. */
export function buildSearchDocument(
  show: Pick<Stream, "title" | "hostName" | "setup" | "transcript">,
  snapshot: StreamSnapshot,
): string {
  const parts = [
    show.title,
    show.hostName ? `Host: ${show.hostName}` : null,
    ...setupLines(show.setup ?? null),
  ];

  for (const item of snapshot.trail) {
    const itemParts = [item.name];
    if (item.retailer) itemParts.push(`(${item.retailer})`);
    if (item.note) itemParts.push(`Note: ${item.note}`);
    parts.push(itemParts.join(" "));
  }

  if (show.transcript) {
    parts.push(`Transcript: ${show.transcript}`);
  }

  return parts.filter(Boolean).join("\n");
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }

  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: trimmed,
  });

  if (embedding.length !== EMBEDDING_DIM) {
    throw new Error(`Unexpected embedding size: ${embedding.length}`);
  }

  return embedding;
}

/** Embed and store search metadata for one ended show. */
export async function indexShowForSearch(slug: string): Promise<void> {
  const show = await getShowBySlug(slug);
  if (!show || show.status !== "ended") return;

  const snapshot = snapshotOf(show);
  const searchText = buildSearchDocument(show, snapshot);
  if (!searchText.trim()) return;

  const embedding = await embedText(searchText);
  const vector = toVectorLiteral(embedding);

  await db
    .update(streams)
    .set({
      searchText,
      embedding: sql`${vector}::vector`,
      updatedAt: new Date(),
    })
    .where(eq(streams.id, show.id));
}

/** Semantic search over ended shows with embeddings. */
export async function searchShows(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const embedding = await embedText(trimmed);
  const vector = toVectorLiteral(embedding);

  const rows = await db
    .select({
      slug: streams.slug,
      title: streams.title,
      hostName: streams.hostName,
      score: sql<number>`1 - (${streams.embedding} <=> ${vector}::vector)`,
    })
    .from(streams)
    .where(
      and(eq(streams.status, "ended"), isNotNull(streams.embedding)),
    )
    .orderBy(sql`${streams.embedding} <=> ${vector}::vector`)
    .limit(limit);

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    hostName: row.hostName,
    score: Number(row.score),
  }));
}
