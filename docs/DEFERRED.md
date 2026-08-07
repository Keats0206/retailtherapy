# Deferred features (post-polish beta)

These are intentionally **not** in scope until after structured beta host sessions surface real friction. Revisit based on observed usage, not roadmap speculation.

## Do not build yet

| Feature | Why deferred | Smallest future version |
|---|---|---|
| Edit/reschedule/cancel scheduled show | No host has asked yet | Host can delete and re-create for now |
| Host earnings dashboard | No commission data in DB; affiliate handled by Channel3 | Read-only recap stats from `stream_products` vote tallies |
| In-app checkout / Stripe | Commerce is affiliate link-out by design | N/A unless business model changes |
| Viewer accounts / follows | Anonymous viewing is sufficient for MVP | N/A until repeat-viewer problem is proven |
| Redis rate limiting | In-process limiter is fine for single-instance beta | Upstash Redis when scaling past one Vercel instance |
| Clerk webhooks / users table | Host identity is Clerk ID on `streams` row | Only if profiles or roles are needed |
| Order / commission tracking | Purchases happen at retailers | Depends on Channel3 reporting or manual reconciliation |
| Chat persistence | Ephemeral chat is acceptable; snapshot has `chatCount` | Only if hosts ask for transcripts |

## Shipped (no longer deferred)

| Feature | Notes |
|---|---|
| Scheduled shows | `/host/schedule`, waitroom, interest signup, reminder cron |
| Host approval gate | Admin waitlist at `/admin/waitlist`, `host_approvals` table |
| Show reminder emails | Resend via `RESEND_API_KEY`; cron every 5m |

## Revisit triggers

- **Edit scheduled show:** Hosts ask to change time after sharing the link
- **Earnings:** Hosts ask "what did I earn?" after 3+ shows each
- **Redis rate limit:** Rate limit false positives or multi-region deploy
- **Discovery/growth:** Hosts say "nobody showed up" — then OG images, share cards

Last updated: schedule-show loop ship.
