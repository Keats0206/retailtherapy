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

`vercel.json` schedules stale-show cleanup every 6 hours via `/api/cron/end-stale-shows`.

## 5. Post-deploy smoke test

With the app running and env configured:

```bash
npm run smoke
```

Or against production:

```bash
SMOKE_TEST_BASE_URL=https://<your-domain> npm run smoke
```

## 6. Invite beta hosts

Add host emails to `HOST_ALLOWLIST` in Vercel, redeploy if needed, and share:

- Sign-up / sign-in link
- `/host` studio URL
- `/privacy` and `/terms` links

## Rollback

- Revert the Vercel deployment to the previous build
- Do **not** roll back database migrations without a plan — schema changes are forward-only
