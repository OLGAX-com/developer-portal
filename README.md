# Olgax Community Platform

Open-source community and mentorship platform built around GitHub. See [.github/copilot-instructions.md](.github/copilot-instructions.md) for the full vision, and [.planning/plan.md](.planning/plan.md) for the build roadmap (internal build-tracking notes, not user-facing docs - those live in `apps/docs`).

## Apps & Packages

- `apps/web` — the main Next.js app
- `apps/docs` — platform documentation (Fumadocs, MDX-in-git)
- `packages/database` — Prisma schema & client
- `packages/auth` — Better Auth (GitHub + Google OAuth), RBAC helper
- `packages/github` — GitHub sync (repos, issues/PRs, reviews, releases) + webhook handling

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start local Postgres:

   ```bash
   docker compose up -d
   ```

3. Copy env files and fill in secrets:

   ```bash
   cp .env.example packages/database/.env
   cp .env.example apps/web/.env.local
   ```

4. Run migrations and seed sample data:

   ```bash
   pnpm --filter @olgax/database run migrate
   pnpm --filter @olgax/database run db:seed
   ```

5. Start the app:

   ```bash
   pnpm dev          # apps/web on http://localhost:3000
   pnpm dev:docs     # apps/docs
   ```

## GitHub / Google OAuth setup

Create the OAuth apps and set these callback (redirect) URLs, then fill the client id/secret into `apps/web/.env.local`:

- GitHub ([github.com/settings/developers](https://github.com/settings/developers)): `http://localhost:3000/api/auth/callback/github`
- Google ([console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)): `http://localhost:3000/api/auth/callback/google`

`BETTER_AUTH_SECRET` can be any random string, e.g. `openssl rand -base64 32`.

The first time you sign in, Better Auth creates a `User` row with the default `CONTRIBUTOR` role. To manage roles locally:

```bash
pnpm --filter @olgax/database run users                                  # list all users
pnpm --filter @olgax/database run promote -- --email=you@example.com     # promote to ADMINISTRATOR
pnpm --filter @olgax/database run promote -- --email=you@example.com --role=MENTOR
```

## Common commands

```bash
pnpm run lint         # lint all packages
pnpm run typecheck    # typecheck all packages
pnpm run test         # run unit tests (packages/database, packages/auth)
pnpm run build        # build apps/web
pnpm run build:docs   # build apps/docs
```

## Syncing GitHub projects

Sync uses `GITHUB_SYNC_TOKEN` (a personal access token with `public_repo` scope is enough for public repos), not a signed-in user's own token, so it keeps working regardless of who's signed in.

```bash
pnpm --filter @olgax/github run add-project -- --owner=vercel --repo=next.js   # register + first sync
pnpm --filter @olgax/github run sync-all                                       # re-sync every tracked project
```

For real-time updates, add a webhook on the tracked repo pointing to `https://<your-domain>/api/github/webhook`, content type `application/json`, secret matching `GITHUB_WEBHOOK_SECRET`, and subscribe to the `issues`, `pull_request`, `pull_request_review`, `release`, and `push` events.

## What's implemented

- **Auth**: GitHub/Google OAuth (Better Auth), role-based access (Visitor/Contributor/Mentor/Maintainer/Administrator)
- **Contributor Module**: profile page with real XP/levels, badges, and contribution history pulled from synced GitHub activity
- **Projects Module**: project listing/detail pages backed by `packages/github` sync; README and contributors are fetched live from GitHub, never duplicated
- **Missions & Badges**: data-driven mission/badge definitions (`prisma/seed.ts`), auto-completed by matching a contributor's GitHub activity
- **Certificates**: PDF generation with an embedded QR code, plus a public `/certificates/[id]` verification page
- **Mentorship**: request → accept/decline → graduate flow, graduation auto-issues a certificate
- **Leaderboards**: global leaderboard live now; per-project/monthly queries in `packages/database` ready to wire into more pages
- **Notifications**: in-app bell, awarded on badge/mission events

See [.planning/plan.md](.planning/plan.md) for the full phase-by-phase roadmap and what's still open (E2E tests, production deployment).

## Docker

```bash
docker build -f apps/web/Dockerfile -t olgax-web .
docker run -p 3000:3000 --env-file apps/web/.env.local olgax-web
```

This builds `apps/web` only, using Next.js standalone output. You still need a reachable
PostgreSQL instance (set `DATABASE_URL` accordingly) — see [.planning/plan.md](.planning/plan.md) Phase 13
for what's left before an actual production launch (hosting choice, managed DB, secrets, monitoring).
