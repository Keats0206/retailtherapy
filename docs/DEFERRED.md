# Deferred features (post-polish beta)

These are intentionally **not** in scope until after the polish ship and 3+ structured beta host sessions. Revisit based on observed friction, not roadmap speculation.

## Do not build yet

| Feature | Why deferred | Smallest future version |
|---|---|---|
| Host apply backend | Manual allowlist works for controlled beta | Email via Resend or Airtable row — no admin panel |
| Host earnings dashboard | No commission data in DB; affiliate handled by Channel3 | Read-only recap stats from `stream_products` vote tallies |
| In-app checkout / Stripe | Commerce is affiliate link-out by design | N/A unless business model changes |
| Viewer accounts / follows | Anonymous viewing is sufficient for MVP | N/A until repeat-viewer problem is proven |
| Redis rate limiting | In-process limiter is fine for single-instance beta | Upstash Redis when scaling past one Vercel instance |
| Clerk webhooks / users table | Host identity is Clerk ID on `streams` row | Only if profiles or roles are needed |
| Order / commission tracking | Purchases happen at retailers | Depends on Channel3 reporting or manual reconciliation |
| Chat persistence | Ephemeral chat is acceptable; snapshot has `chatCount` | Only if hosts ask for transcripts |

## Revisit triggers

- **Apply backend:** More than ~5 applicants/week and manual review becomes painful
- **Earnings:** Hosts ask "what did I earn?" after 3+ shows each
- **Redis rate limit:** Rate limit false positives or multi-region deploy
- **Discovery/growth:** Hosts say "nobody showed up" — then OG images, share cards, notifications

Last updated: polish ship (controlled beta phase).
