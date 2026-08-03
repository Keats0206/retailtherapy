import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

/**
 * Hosts whose shows are hidden from public discovery — the homepage, /browse,
 * and GET /api/shows?status=live. Direct /show/<slug> links still work so a
 * host can preview their own recap.
 *
 * Built-ins cover the smoke-test account (`smoke-test-user` / "Smoke Test Host")
 * and the founder's dev account (keats0206@gmail.com). Extend with
 * comma-separated env vars as more test accounts appear:
 *
 *   DISCOVERY_EXCLUDED_HOST_IDS=user_abc,user_def
 *   DISCOVERY_EXCLUDED_HOST_NAMES=QA Bot,Smoke Test Host
 *   DISCOVERY_EXCLUDED_EMAILS=dev@example.com
 *   DISCOVERY_EXCLUDED_USERNAMES=devaccount
 *
 * Metrics reuses the same static ids via `getMetricsExcludedHostIds`.
 */
const BUILTIN_EXCLUDED_HOST_IDS = ["smoke-test-user"];

const BUILTIN_EXCLUDED_HOST_NAMES = ["Smoke Test Host"];

const BUILTIN_EXCLUDED_EMAILS = ["keats0206@gmail.com"];

const BUILTIN_EXCLUDED_USERNAMES = ["keats0206"];

let resolvedDiscoveryIds: Set<string> | null = null;
let resolvePromise: Promise<Set<string>> | null = null;

function parseCsvEnv(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function staticExcludedHostIds(): Set<string> {
  const fromEnv = [
    ...parseCsvEnv(process.env.DISCOVERY_EXCLUDED_HOST_IDS),
    ...parseCsvEnv(process.env.METRICS_EXCLUDED_HOST_IDS),
  ];
  return new Set([...BUILTIN_EXCLUDED_HOST_IDS, ...fromEnv]);
}

function staticExcludedHostNames(): Set<string> {
  const fromEnv = parseCsvEnv(process.env.DISCOVERY_EXCLUDED_HOST_NAMES);
  return new Set([...BUILTIN_EXCLUDED_HOST_NAMES, ...fromEnv]);
}

export type DiscoveryExclusions = {
  hostIds: Set<string>;
  hostNames: Set<string>;
};

async function resolveClerkExcludedHostIds(): Promise<Set<string>> {
  const emails = [
    ...BUILTIN_EXCLUDED_EMAILS,
    ...parseCsvEnv(process.env.DISCOVERY_EXCLUDED_EMAILS),
  ];
  const usernames = [
    ...BUILTIN_EXCLUDED_USERNAMES,
    ...parseCsvEnv(process.env.DISCOVERY_EXCLUDED_USERNAMES),
  ];

  if (emails.length === 0 && usernames.length === 0) {
    return new Set();
  }

  const ids = new Set<string>();

  try {
    const client = await clerkClient();

    for (const email of emails) {
      const { data } = await client.users.getUserList({
        emailAddress: [email],
        limit: 1,
      });
      for (const user of data) {
        ids.add(user.id);
      }
    }

    for (const username of usernames) {
      const { data } = await client.users.getUserList({
        username: [username],
        limit: 1,
      });
      for (const user of data) {
        ids.add(user.id);
      }
    }
  } catch (err) {
    console.error("[excluded-hosts] Clerk lookup failed", err);
  }

  return ids;
}

/** Sync ids for metrics — static env + built-ins only. */
export function getMetricsExcludedHostIds(): Set<string> {
  return staticExcludedHostIds();
}

/** Full discovery exclusion set, with emails/usernames resolved once via Clerk. */
export async function getDiscoveryExclusions(): Promise<DiscoveryExclusions> {
  const hostIds = await getDiscoveryExcludedHostIds();
  return { hostIds, hostNames: staticExcludedHostNames() };
}

/** Full discovery exclusion set, with emails/usernames resolved once via Clerk. */
export async function getDiscoveryExcludedHostIds(): Promise<Set<string>> {
  if (resolvedDiscoveryIds) return resolvedDiscoveryIds;

  if (!resolvePromise) {
    resolvePromise = (async () => {
      const ids = staticExcludedHostIds();
      for (const id of await resolveClerkExcludedHostIds()) {
        ids.add(id);
      }
      resolvedDiscoveryIds = ids;
      return ids;
    })();
  }

  return resolvePromise;
}
