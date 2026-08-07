# Production deploy checklist (controlled beta)

Use this before inviting real hosts. Run steps in order.

**Quick local check** (before deploy):

```bash
npm run verify:env
npm run typecheck && npm run lint && npm run build
```

See also [docs/BETA_SESSION_GUIDE.md](./docs/BETA_SESSION_GUIDE.md) and [docs/DEFERRED.md](./docs/DEFERRED.md).

## 1. Database

```bash
# Point DATABASE_URL at production Neon (pooled connection string)
npm run db:migrate
```

After merging schedule-show + hosting approval, ensure migrations `0010_host_approvals` and `0010_show_scheduling` have run (creates `host_approvals`, `show_interests`, `show_reminder_jobs`).

If the database already has rows from an older schema, backfill `slug`, `host_user_id`, and `room_name` before running migration `0001`, or start from a fresh Neon branch.

Verify:

```bash
curl https://<your-domain>/api/health
# → { "ok": true, "db": "ok" }
```

## 2. Vercel environment variables

Set these in the Vercel project (Production environment):

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Use `pk_live_…` |
| `CLERK_SECRET_KEY` | Use `sk_live_…` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `HOST_ALLOWLIST` | Comma-separated beta host emails |
| `DATABASE_URL` | Neon pooled connection |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | LiveKit Cloud |
| `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` | Mux access token |
| `CHANNEL3_API_KEY` | Product lookup |
| `CRON_SECRET` | Random string; matches Vercel Cron auth header |
| `RESEND_API_KEY` | Optional — enables pre-show reminder emails |
| `RESEND_FROM_EMAIL` | Optional — e.g. `Frontrow <reminders@yourdomain.com>` |
| `NEXT_PUBLIC_APP_URL` | Optional — full origin for email links (defaults to `VERCEL_URL`) |
| `SENTRY_DSN` | Optional but recommended |

Sync from local `.env.local` (optional):

```bash
./scripts/sync-vercel-env.sh
```

## 3. Clerk dashboard

- Restrict sign-up to invited emails or disable open registration
- Enable email verification for production instance
- Confirm redirect URLs include your production domain

## 4. Deploy

Push to the branch connected to Vercel, or:

```bash
vercel --prod
```

`vercel.json` schedules stale-show cleanup hourly and show-reminder processing every 5 minutes via `/api/cron/show-reminders`.

## 5. Post-deploy smoke test

With the app running and env configured:

```bash
npm run smoke
```

Or against production:

```bash
SMOKE_TEST_BASE_URL=https://<your-domain> npm run smoke
SMOKE_TEST_BASE_URL=https://<your-domain> npm run smoke:schedule
```

The schedule smoke test inserts a temporary scheduled show, exercises the interest API and waitroom UI, then cleans up.

## 5b. Web Analytics (optional but recommended)

The app ships with `@vercel/analytics` for automatic pageviews and custom button-click events (see `src/lib/analytics.ts`).

1. Vercel dashboard → Project → **Analytics** → enable **Web Analytics**
2. Or CLI: `vercel project web-analytics`
3. Custom events appear in production only; locally, open the browser console and look for `[Vercel Web Analytics]` debug logs when clicking instrumented buttons (`<Analytics debug />` is enabled in development)

No extra env vars are required on Vercel-hosted deployments.

## 6. Invite beta hosts

Add host emails to `HOST_ALLOWLIST` in Vercel, redeploy if needed, and share:

- Sign-up / sign-in link
- `/host` studio URL
- `/privacy` and `/terms` links

## Rollback

- Revert the Vercel deployment to the previous build
- Do **not** roll back database migrations without a plan — schema changes are forward-only
