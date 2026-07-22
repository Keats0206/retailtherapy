# frontrow (retailtherapy)

Live shopping from the browser. Hosts go live over WebRTC (LiveKit), pin products from retailer URLs (Channel3), and viewers vote and chat in real time. When a show ends, the broadcast is archived to Mux and replayed at `/s/<slug>` with the shopping trail intact.

## Routes

| Route | Purpose |
|---|---|
| `/` | Homepage — lists live shows from the database |
| `/host` | Host studio (Clerk auth + email allowlist) |
| `/s/<slug>` | Public viewer page — live room or Mux replay |
| `/dashboard` | Host dashboard — past and live shows |
| `/privacy`, `/terms` | Legal pages |
| `/prototype`, `/ui-proto/*` | UI sandbox (dev only; blocked in production) |

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local`:

| Variable | Service |
|---|---|
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | [LiveKit Cloud](https://cloud.livekit.io) |
| `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` | [Mux](https://mux.com) |
| `DATABASE_URL` | [Neon](https://neon.tech) (pooled connection string) |
| `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY` | [Clerk](https://clerk.com) |
| `HOST_ALLOWLIST` | Comma-separated emails allowed to host |
| `CHANNEL3_API_KEY` | [Channel3](https://trychannel3.com/developers) (product lookup) |

4. Apply the database schema:

```bash
npm run db:generate   # after schema changes
npm run db:migrate    # apply migrations
# or: npm run db:push  # dev-only schema sync
```

5. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Show lifecycle

1. Host signs in and opens `/host`
2. `POST /api/shows` creates a DB row, provisions a Mux live stream, and mints a LiveKit host token
3. Host connects → `POST /api/shows/<slug>/recording` starts LiveKit egress to Mux
4. Viewers open `/s/<slug>` — no auth required
5. Host pins products via Channel3 lookup; snapshot autosaves every 30s
6. Host ends show → egress stops, Mux packages the asset, trail is frozen
7. Replay viewers poll until `muxPlaybackId` is ready

## Production deploy

See [DEPLOY.md](./DEPLOY.md) for the controlled-beta checklist (migrations, env vars, Clerk, smoke test).

## Scripts

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run db:studio    # Drizzle Studio
npm run smoke        # End-to-end show API smoke test
npm run typecheck    # TypeScript without full build
```

## Prototype routes

`/prototype` and `/ui-proto/*` run entirely on mock data — useful for UI iteration without LiveKit, Mux, or Channel3 credentials.
