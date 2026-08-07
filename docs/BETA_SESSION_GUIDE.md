# Beta host session guide

Run **3 structured sessions** after the polish deploy lands in production. Goal: observe real friction — not build new features during sessions.

## Before each session

- [ ] Host email is on `HOST_ALLOWLIST` in Vercel
- [ ] Host has signed up in Clerk (production instance)
- [ ] You are **not** screen-sharing or driving — host runs solo
- [ ] One viewer device ready (phone + laptop ideal)
- [ ] Note-taking doc open (copy template below)

## Session script (30–45 min)

### 1. Go live solo (< 5 min target)

Host path: sign in → `/home` → **Go live as host** → `/host` preshow → **Go live**

| Check | Pass | Notes |
|---|---|---|
| Camera/mic preview works | ☐ | |
| Title entered (or default accepted) | ☐ | |
| Show created without Slack/help | ☐ | |
| Share link copied or opened | ☐ | |

### 2. Viewer joins via shared link

Viewer path: open `/s/<slug>` on phone (no auth)

| Check | Pass | Notes |
|---|---|---|
| Video loads (screen share + camera bubble) | ☐ | |
| Chat message sends | ☐ | |
| Buy / Skip vote registers | ☐ | |
| Product rail visible on mobile | ☐ | |

### 3. Host pins a product

Host path: paste retailer URL → pin → spotlight or verse

| Check | Pass | Notes |
|---|---|---|
| Channel3 lookup succeeds | ☐ | |
| Product appears for viewer | ☐ | |
| "Shop at {retailer}" opens correct URL | ☐ | |

### 4. End show

Host path: **End show** from studio **or** home

| Check | Pass | Notes |
|---|---|---|
| End confirm dialog clear | ☐ | |
| Show moves to past shows | ☐ | |
| Viewer sees ended/recap state | ☐ | |
| Mux recording appears (note wait time: ___ min) | ☐ | |

### 5. Replay link

| Check | Pass | Notes |
|---|---|---|
| `/s/<slug>` replay plays | ☐ | |
| Shopping trail visible | ☐ | |
| Host recap at `/host/<slug>` loads | ☐ | |

### 6. Schedule a show (optional — run once across beta)

Host path: sign in → `/home` → **Schedule show** → pick date/time → copy waitroom link

| Check | Pass | Notes |
|---|---|---|
| Show appears under **Your shows → Scheduled** | ☐ | |
| Waitroom link opens `/waitroom/<slug>` with countdown | ☐ | |
| Viewer taps **I'm interested** (guest email or signed in) | ☐ | |
| Show appears in **Upcoming shows** on home | ☐ | |

### 7. Go live from scheduled show

Host path: **Your shows → Manage** → **Go live now**

| Check | Pass | Notes |
|---|---|---|
| Host enters studio without re-entering setup | ☐ | |
| Viewer in waitroom auto-redirects to live show | ☐ | |
| Full live cycle (steps 2–5) still works | ☐ | |

## Friction log (fill after each session)

```text
Session #: ___
Date: ___
Host: ___
Viewer device: ___

Blockers (could not complete step):
-

Confusing UX (completed but struggled):
-

Polish candidates (small fixes, no new features):
-

Quotes (host verbatim):
-
```

## Likely polish items to watch for

- Recording wait UX on ended page (spinner / copy)
- Mobile viewer layout on `/s/[slug]`
- Share link copy button in host studio
- Browse empty state when no one is live
- 409 messaging when host already has a live show
- Scheduled show datetime picker UX (timezone clarity)
- Waitroom interest signup copy for guests vs signed-in viewers

## Success criteria (after 3 sessions)

- [ ] At least 3 hosts complete full cycle without your intervention
- [ ] Short friction list with **observed** items only
- [ ] Decision on **one** post-polish wedge (see [DEFERRED.md](./DEFERRED.md))
