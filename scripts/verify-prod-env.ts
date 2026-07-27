/**
 * Pre-deploy env check. Run before production deploy:
 *   npx tsx --env-file=.env.local scripts/verify-prod-env.ts
 *
 * For production URL smoke test after deploy:
 *   SMOKE_TEST_BASE_URL=https://your-domain npm run smoke
 */

const REQUIRED = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "MUX_TOKEN_ID",
  "MUX_TOKEN_SECRET",
  "CHANNEL3_API_KEY",
  "CRON_SECRET",
] as const;

const RECOMMENDED = ["HOST_ALLOWLIST", "SENTRY_DSN"] as const;

function main() {
  if (process.env.NEXT_PUBLIC_LOCAL_STREAM === "1") {
    console.error(
      "NEXT_PUBLIC_LOCAL_STREAM is enabled — design mode must not ship to production.",
    );
    process.exit(1);
  }

  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  const missingRecommended = RECOMMENDED.filter(
    (key) => !process.env[key]?.trim(),
  );

  if (missing.length > 0) {
    console.error("Missing required env vars:");
    for (const key of missing) console.error(`  - ${key}`);
    process.exit(1);
  }

  console.log("Required env vars: OK");

  if (missingRecommended.length > 0) {
    console.warn("Missing recommended env vars:");
    for (const key of missingRecommended) console.warn(`  - ${key}`);
  } else {
    console.log("Recommended env vars: OK");
  }

  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (clerkKey.startsWith("pk_test_")) {
    console.warn(
      "Clerk publishable key is pk_test_ — use pk_live_ for production.",
    );
  }

  console.log("\nNext steps (see DEPLOY.md):");
  console.log("  1. npm run db:migrate  (against production DATABASE_URL)");
  console.log("  2. Deploy to Vercel");
  console.log("  3. curl https://<domain>/api/health");
  console.log("  4. SMOKE_TEST_BASE_URL=https://<domain> npm run smoke");
  console.log("  5. Add beta hosts to HOST_ALLOWLIST");
}

main();
