# The System

A Solo Leveling–styled progression tracker for LeetCode practice. Sign in with Google,
pick an Active Set (Pareto 49 / Blind 75 / NeetCode 150), log attempts, earn EXP, keep a
daily streak, and compare progress with friends on per-group leaderboards.

## Stack

- Next.js (App Router) + React + TypeScript
- Auth.js v5 (`next-auth`) with the Prisma adapter — Google OAuth, **database sessions**
- Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Supabase Postgres
- Tailwind CSS v4, Framer Motion, Recharts, Lucide React

> **Prisma 7 note**: connection URLs no longer live in `schema.prisma`. Migrate/Studio read
> them from `prisma.config.ts` (`DIRECT_URL`), and the app connects through the driver
> adapter in `lib/prisma.ts` (`DATABASE_URL`).

## Setup

### 1. Install

```bash
npm install
```

### 2. Database

Create a Supabase project, then from **Project Settings → Database** copy:

- the **pooled** connection (port 6543, `?pgbouncer=true`) → `DATABASE_URL`
- the **direct** connection (port 5432) → `DIRECT_URL`

The app's runtime queries use the pooled URL; Prisma Migrate uses the direct URL, because
pgbouncer's transaction pooling can't run DDL.

### 3. Google OAuth

1. **console.cloud.google.com** → create a project.
2. **APIs & Services → OAuth consent screen** (newer UI: **Google Auth Platform**):
   - User type **External**; fill in app name and support emails.
   - Leave publishing status on **Testing** and add your own Google account under
     **Test users**. Only the default `openid` / `email` / `profile` scopes are requested,
     so no Google verification review is needed.
3. **Credentials → Create Credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - For production add the same pair under your real domain.
4. Copy the client ID and secret into `.env`.

The redirect URI must match **exactly** — a trailing slash or `http` vs `https` mismatch is
the usual cause of `redirect_uri_mismatch`.

### 4. Environment

```bash
cp .env.example .env
# then fill in DATABASE_URL, DIRECT_URL, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
openssl rand -base64 32   # -> AUTH_SECRET
```

### 5. Migrate + seed

```bash
npm run db:migrate
npm run db:seed
```

The seed populates the shared catalog only — no user rows (those are created on first
Google sign-in). It ends with a sanity check that must print **150 unique problems** and
**49 / 75 / 150** per set.

### 6. Run

```bash
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Idempotent catalog seed (upserts by slug) |
| `npm run db:studio` | Prisma Studio |

## How it works

### The catalog is deduplicated
Blind 75 is a strict subset of NeetCode 150, and all 49 Pareto problems are inside it too.
So there is **one** `Problem` table of 150 unique rows, and `ProblemSetItem` rows attach
each problem to the sets it belongs to (with a per-set `orderIndex`). A problem solved
while browsing one set counts as solved in every set containing it, and grants EXP once.

`prisma/catalog.json` is generated from
[`neetcode-gh/leetcode`](https://github.com/neetcode-gh/leetcode)'s own
`.problemSiteData.json`, so the seed is reproducible offline. Regenerate it if the upstream
list is revised; the seed prunes memberships that disappear from a list, so counts stay
honest.

### Rank vs Level
- **Rank** is the share of your **Active Set** solved (E <20%, D <40%, C <60%, B <80%,
  A <100%, S at 100%). It's derived at query time, never stored, because it changes the
  moment you switch sets.
- **Level** is `floor(totalExp / 250) + 1` — global and identical for everyone, so it stays
  comparable on leaderboards. Easy +50, Medium +100, Hard +150, granted **once** per unique
  problem on its first `ACCEPTED` submission. Re-logging a solved question records history
  and counts toward the review quota, but grants no EXP.

### Daily quests, streaks, and penalties
Quests are generated lazily on the first activity of each day (in `APP_TIMEZONE`) — no cron
or edge function needed. Rolling the day over also settles the previous one:

- Quota met → streak continues.
- Quota missed, a **streak freeze** available → freeze is spent, streak survives.
- Quota missed, no freezes → streak resets to 0 and the next day becomes a **Penalty
  Quest** with an escalated target, capped per track.

Freezes refill monthly. Track targets and allowances live in `lib/constants.ts`; switching
tracks affects only future quests and never rewrites history.

### Leaderboards
Per group, computed live at query time (no stored leaderboard table). Ranked by **Total EXP
and questions solved — never the Rank letter**, since Rank is relative to each member's own
Active Set. Group members can see each other's Level, EXP, streak, and solved count;
submission notes and code snippets are always private to their author.

### Front door and first run
`/` serves a public landing page to signed-out visitors and the dashboard to signed-in
ones. A brand-new account is routed to `/onboarding` — a three-step wizard (name and
avatar, daily-goal track, starting problem set) that ends by generating the first
`DailyQuest` from the chosen track. `User.hasCompletedOnboarding` makes it strictly
one-time; everything it sets stays editable in Settings.

### The interface — one holographic pane
The whole application is a single window projected into a void, not a page of cards.

- **One pane.** Every signed-in surface renders inside the same frame; the tabs in its top
  edge swap what it displays. There is no top nav bar, no card grid, and no modal — logging
  an attempt expands in place inside the question manifest.
- **Zero border-radius.** Corners are cut with `clip-path`, and the border is an SVG overlay
  so it can carry L-brackets and index ticks and trace itself on load.
- **Near-monochrome.** One light temperature (`--v-light`) composed at an alpha ladder does
  all the hierarchy. Exactly three hues carry meaning and nothing else is colored: `rank`
  (warm, rank only), `ok` and `bad` (attempt outcomes only).
- **Dividers carry their labels,** so no section needs a tracked-out caps eyebrow above it.
- **One motion moment.** The pane boots once (~600ms: border traces, brackets snap, sections
  resolve top to bottom). After that motion is user-triggered only. The single persistent
  effect is a slow scanline drift. `prefers-reduced-motion` skips the boot entirely.

The alpha ladder's floors are set by contrast rather than taste: below roughly 0.50 the
tertiary tier stops clearing 4.5:1 against the pane, so the ladder is compressed rather than
abandoned. Verified by measuring the rendered DOM — 662 text nodes across status, questions,
groups and settings in both themes, zero failures.

Light mode is the same design with the light temperature inverted (dark ink on a pale
field), not a separate visual language. The three-state theme system (System/Light/Dark,
cookie + account persistence, no flash) is unchanged.

### Auth boundaries
`proxy.ts` (Next.js 16's replacement for `middleware.ts`) only checks that a session cookie
is *present* — database sessions can't be validated at the edge. The real check is
`requireUserId()` in `lib/session.ts`, called by every protected page and server action.
This is deliberate defense in depth: Next.js middleware has been bypassable via spoofed
headers (CVE-2025-29927), so it is treated as a redirect convenience, not a security
boundary.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Set `DATABASE_URL`, `DIRECT_URL`, `APP_TIMEZONE`, `AUTH_GOOGLE_ID`,
   `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, and `AUTH_URL` (your production URL).
3. Add the production redirect URI in Google Cloud Console:
   `https://<your-domain>/api/auth/callback/google`.
4. Run `npm run db:migrate` and `npm run db:seed` against the production database once
   before first use.
