# Olgax Community Platform — Build Plan

This is the living roadmap for building the Olgax Community Platform end-to-end.
See [.github/copilot-instructions.md](../.github/copilot-instructions.md) for the full vision and coding standards.

## How to use this document

- Check off a task with `- [x]` once it's merged and working.
- Add a short dated note under a task if there's something worth remembering (a decision, a gotcha, a follow-up). Keep notes to one line.
- Work top to bottom by phase, but phases can overlap once Phase 0-2 are done.

---

## Phase 0 — Foundation & Tooling

- [x] Decide monorepo layout (`apps/web`, `apps/docs`, `packages/ui`, `packages/database`, etc.) vs. current single Next.js app
  - 2026-07-31: Chose monorepo now. Migrated to `apps/web` + pnpm workspaces; more `apps/*`/`packages/*` added as each module needs one.
- [x] Migrate repo to pnpm workspaces (`pnpm-workspace.yaml` packages field) if monorepo is chosen
- [x] Shared TypeScript config (`tsconfig.base.json`) and shared ESLint/Prettier config
  - `tooling/typescript/base.json` shared; `apps/web` extends it. ESLint config stays per-app (Next.js plugin needs app-local config).
- [x] `.env.example` with all required environment variables
- [x] Docker Compose for local PostgreSQL (+ Redis later)
  - Runs on host port `5434` (5432/5433 already used by other local projects).
- [x] CI workflow: lint, typecheck, build on PR

## Phase 1 — Database & Auth

- [x] Add Prisma, connect to PostgreSQL — `packages/database`
- [x] Core schema: `User`, `Profile`, `Account`, `Role` (id/createdAt/updatedAt on every model, UUIDs) — plus `Session`/`Verification` for Better Auth
- [x] Better Auth (or Auth.js) with GitHub OAuth — `packages/auth`, route handler at `apps/web/app/api/auth/[...all]/route.ts`
- [x] Google OAuth — same Better Auth config, needs real credentials in `.env.local`
- [x] Session/middleware for protected routes — `apps/web/proxy.ts` (Next.js 16 renamed middleware → proxy), currently guards `/dashboard/*`
- [x] Role-based authorization helpers (Visitor / Contributor / Mentor / Maintainer / Administrator) — `hasRole()` in `packages/auth/src/rbac.ts`
- [x] Seed script for local dev data — `packages/database/prisma/seed.ts` (`pnpm --filter @olgax/database db:seed`)
- [x] Account management scripts — `pnpm --filter @olgax/database run users` (list) / `run promote -- --email=... --role=...` (promote a user who signed in via OAuth)

## Phase 2 — Design System & App Shell

- [x] Brand theme tokens (navy/yellow), dark mode via `.dark` class, Inter font
- [x] Favicons (light/dark variants) wired into metadata
- [x] Base layout: header, footer, nav/sidebar
- [x] shadcn/ui setup + core primitives (Button, Card, Badge, Avatar, Dialog, etc.)
  - Base UI-backed (`shadcn` v4), kept directly in `apps/web` (not a shared `packages/ui`) since no second consumer needs them yet. Revisit extraction if `apps/docs` or a future app needs the same components.
- [x] Shared feature components: `ContributorCard`, `ProjectCard`, `BadgeCard`, `MissionCard`
- [x] Landing page (replace default Next.js starter page)

## Phase 3 — GitHub Integration

- [x] GitHub OAuth token storage per user — already covered by Better Auth's `Account` table (Phase 1); sign-in scope stays identity-only (least privilege)
- [x] Sync repositories — `packages/github` `syncProject()`, `Project` model
- [x] Sync issues & pull requests — `syncIssuesAndPullRequests()`, `GithubIssue` model (PRs are issues with `isPullRequest`/`isMerged` flags, matching GitHub's own API)
- [x] Sync reviews & commits — `syncReviewsForPullRequest()`, `GithubReview` model. Commits intentionally NOT persisted (would duplicate GitHub for little benefit); fetch on demand later if needed.
- [x] Sync releases — `syncReleases()`, `GithubRelease` model
- [x] Webhooks for real-time updates — `apps/web/app/api/github/webhook/route.ts`, HMAC-verified, re-syncs the affected project on `issues`/`pull_request`/`pull_request_review`/`release`/`push`
- [x] Background job/rate-limit handling for sync — Octokit retry + throttling plugins (`packages/github/src/client.ts`); `pnpm --filter @olgax/github run sync-all` runnable on a schedule (cron / GitHub Actions) until a real job queue is needed

## Phase 4 — Contributor Module

- [x] Contributor profile page (GitHub data, XP, level) — `/profile`
- [x] XP & leveling logic (service, reusable) — `packages/database/src/services/xp.ts` (`calculateLevel`) + `profile.ts` (`addXp`), unit tested
- [x] Contribution history view — matches `Profile.githubUsername` against synced `GithubIssue`/`GithubReview`
- [x] Badges & achievements display (consumes Phase 7) — shown on `/profile`
- [ ] Gamified onboarding dashboard, task board, and mentor verification — see [docs/onboarding-and-community-plan.md](./onboarding-and-community-plan.md)

## Phase 5 — Projects Module

- [x] Project overview page (description, roadmap) — `/projects`, `/projects/[slug]`, backed by real synced data (`OLGAX-com/olgax-pos`)
- [x] Documentation tab: sync & render the project's own GitHub `README.md` + full `docs/` folder — never authored locally (source of truth stays on GitHub) — `getReadme()` (rendered inline on `/projects/[slug]`) + `listDocsPages()`/`getDocPage()` (consumed via a public `apps/web` API and rendered as real multi-page docs inside `apps/docs`, see below), all fetched live, never persisted. Relative links/images within rendered Markdown resolve against the source repo (`linkBase` prop) instead of 404ing on our own domain.
- [x] `apps/docs` is the single home for ALL documentation, platform + every project's: `/docs/projects` (index), `/docs/projects/[slug]` (one project's pages), `/docs/projects/[slug]/[page]` (one page, with a real Fumadocs TOC generated from the live content via `getTableOfContents`/`remarkHeading`). Data comes from new public, read-only `apps/web` endpoints (`GET /api/projects`, `GET /api/projects/[slug]/docs`, `GET /api/projects/[slug]/docs/[page]`) fetched server-side — `apps/docs` still has no direct database dependency, keeping it independently deployable. The earlier `apps/web` UI routes for this (`/projects/[slug]/docs*`) were removed once this moved, to avoid two competing implementations of the same feature.
- [x] Maintainers & contributors list — `ProjectMaintainer` model + live `getContributors()`
- [x] Issues/PRs feed (from GitHub sync)
- [x] Releases feed

## Phase 6 — Missions Module

- [x] Configurable mission types data model (First PR, Docs, Bug Fix, Testing, Review, Community Support) — `Mission`/`MissionType`, seeded data-driven in `prisma/seed.ts`
- [x] Mission assignment & completion tracking — `UserMission`, `checkAndCompleteMissions()` auto-completes by matching synced GitHub activity
- [x] Mission rewards hook (XP, badge awards) — same function calls `addXp`/`awardBadge`

## Phase 7 — Badges & Certificates

- [x] Data-driven badge definitions (no hardcoding) — `Badge` model, seeded in `prisma/seed.ts`
- [x] Badge award service — `awardBadge()` (idempotent, creates a notification)
- [x] Certificate generation (PDF) with contributor name, cert id, issue date, mentor, achievements — `pdf-lib`, verified generating real PDFs at runtime
- [x] QR verification + public certificate verification page — `/certificates/[id]`, QR embedded via `qrcode`, links back to that page

## Phase 8 — Mentorship Module

- [x] Mentor & student profiles — any user with role `MENTOR`/`MAINTAINER`/`ADMINISTRATOR` is listed on `/mentorship`
- [x] Mentorship requests — `requestMentorship()`
- [ ] Sessions & assignments — `MentorshipSession` model exists; no scheduling UI yet
- [x] Progress tracking & feedback — `status` (`PENDING`/`ACTIVE`/`GRADUATED`/`DECLINED`), `feedback` field
- [x] Graduation flow — `graduateMentorship()`, auto-issues a certificate
- [x] Support multiple cohorts (reusable, not hardcoded to one) — `Cohort` model, optional `cohortId` on `Mentorship`

## Phase 9 — Leaderboards

- [x] Reusable leaderboard calculation service — `packages/database/src/services/leaderboard.ts`
- [x] Global leaderboard — `getGlobalLeaderboard()`, live on `/leaderboard`
- [x] Monthly leaderboard — `getMonthlyLeaderboard()` (service ready; not yet wired to a page)
- [x] Per-repository leaderboard — `getProjectLeaderboard()` (service ready; not yet wired to a page)
- [ ] University/cohort leaderboard — `Profile.university` field added; no query/page yet

## Phase 10 — Notifications

- [x] Notification data model — `Notification`/`NotificationType`
- [x] In-app notifications (bell/inbox) — `NotificationBell` in the header, mark-all-read Server Action
- [ ] Background jobs setup (Trigger.dev or Inngest) — deferred until there's a real scheduling need
- [ ] Email notifications (future)

## Phase 11 — Documentation Module

Platform docs only (per-project docs are synced from GitHub, see Phase 5). Docs-as-code: `.md`/`.mdx` in git, reviewed via PR, no CMS.

- [x] `apps/docs` scaffold (Fumadocs)
- [x] Feature docs for each module (overview, setup, usage, examples) — getting-started, architecture, contributing, + one page per module
- [x] Contributor onboarding guide — covered by getting-started.mdx + contributing.mdx

## Phase 12 — Testing & QA

- [x] Unit test setup (Vitest) — `packages/database`, `packages/auth`, run via `pnpm run test` (also in CI)
- [ ] Integration tests for critical business logic (XP, badges, mentorship state) — pure logic (xp curve, RBAC ordering) is unit tested; DB-backed integration tests (real Postgres) not set up yet
- [ ] E2E tests for key flows (Playwright)
- [ ] Accessibility pass (keyboard nav, screen reader, contrast)

## Phase 13 — Deployment & Launch

- [ ] Production environment setup (hosting, DB, secrets) — needs a hosting decision from you (Docker self-host vs. Vercel/Netlify + managed Postgres, matching the pattern `olgax-pos` itself supports)
- [x] `apps/web` Dockerfile (standalone output, multi-stage) — builds and runs; not deployed anywhere
- [ ] CI/CD deploy pipeline — CI (lint/typecheck/test/build) exists; no deploy step yet, blocked on the hosting decision above
- [ ] Monitoring & error tracking
- [ ] Launch checklist / go-live

---

## Progress Log

Add a dated one-liner here whenever a phase task is completed or a notable decision is made.

- 2026-07-31 — Repo initialized as single Next.js app; plan created.
- 2026-07-31 — Migrated to pnpm monorepo: app moved to `apps/web`, root `package.json` is now a workspace orchestrator, added `tooling/typescript/base.json` shared config. Lint, typecheck, and build all verified passing.
- 2026-07-31 — Phase 1 scaffolded: `packages/database` (Prisma schema + client), `packages/auth` (Better Auth + GitHub/Google OAuth + `hasRole`), `apps/web` auth route handler + `proxy.ts` route guard, Docker Compose Postgres (port 5434), seed script. Migration + seed verified against local DB; build/typecheck/lint all pass. Still need real GitHub/Google OAuth credentials for social login to actually work.
- 2026-07-31 — Docs architecture decided: platform docs are MDX-in-git (`apps/docs`, Fumadocs), no CMS. Per-project docs are synced/rendered from each project's own GitHub repo, never duplicated locally. Recorded in `.github/copilot-instructions.md`.
- 2026-07-31 — `apps/docs` scaffolded with Fumadocs (create-fumadocs-app). Note: must build/dev with `--webpack` — fumadocs-mdx's webpack loader is ESM and breaks Turbopack on this Next.js version. Added CI workflow (lint/typecheck/build both apps) and `packages/database` postinstall `prisma generate`. Added `promote`/`users` scripts for managing roles on accounts created via GitHub/Google sign-in. README rewritten with real setup + OAuth callback URL instructions.
- 2026-07-31 — Phase 2: initialized shadcn/ui (Base UI) directly in `apps/web`, restored brand navy/yellow theme tokens (the CLI init overwrote them with a generic grayscale preset — fixed), added `next-themes` for the toggle, `SiteHeader`/`SiteFooter`, `UserMenu` wired to real Better Auth sign-in/sign-out, and the landing page. Fixed a real bug: nesting `Button` inside `SheetTrigger`/`DropdownMenuTrigger` via the `render` prop caused hydration mismatches (double `render`-composition) — fixed by styling triggers directly with `buttonVariants()` instead. Also added `nativeButton={false}` where `Button` renders a `Link`. Verified in-browser: no hydration errors after the fix.
- 2026-07-31 — Phase 3: added `packages/github` (Octokit + retry/throttling plugins), `Project`/`GithubIssue`/`GithubReview`/`GithubRelease` models + migration, webhook route, and `add-project`/`sync-all` scripts. Verified the sync logic end-to-end against the real GitHub API (unauthenticated smoke test against octocat/Hello-World: correctly synced the repo + 474 issues/PRs before hitting the expected unauthenticated rate limit on review sync — confirms upserts and API field mappings are correct; the real client uses `GITHUB_SYNC_TOKEN` + throttling plugin so this won't happen in practice). Test data cleaned up afterward. Still needs a real `GITHUB_SYNC_TOKEN` and a webhook configured on a tracked repo to fully exercise in production.
- 2026-08-06 — Grounded the rest of the build in the real OLGAX-com org: tracked `OLGAX-com/olgax-pos` for real (7 issues/PRs, 2 releases, real contributors), linked the real signed-in user (`Krishanthaudayakumara`) as maintainer + promoted to ADMINISTRATOR. Fixed a real gap: nothing previously created a `Profile` row or captured a GitHub username on sign-up — added Better Auth `databaseHooks` (`user.create.after`, `account.create.after`) to do both, plus a `backfill-profiles` script for pre-existing users.
- 2026-08-06 — Built Phases 4–11 for real: full service layer in `packages/database/src/services` (xp, profile, badges, missions, leaderboard, certificates, mentorship, notifications), corresponding schema (`Badge`, `UserBadge`, `Mission`/`MissionType`, `UserMission`, `Certificate`, `Cohort`, `Mentorship`/`MentorshipSession`, `Notification`, `ProjectMaintainer`, `Profile.university`), and real pages wired to all of it (`/profile`, `/projects`, `/projects/[slug]`, `/missions`, `/leaderboard`, `/mentorship`, `/certificates/[id]`). Added PDF certificate generation (`pdf-lib` + `qrcode`) and verified it produces a real, valid PDF at runtime. Verified mission auto-completion end-to-end against the real user's synced `olgax-pos` PR (auto-awarded "Ship your first PR" + XP + badge). Added Vitest unit tests (xp curve, RBAC ordering) and wired them into CI. Replaced all fictional landing-page sample data with live queries. Added an `apps/web` Dockerfile (Next.js standalone) for Phase 13, deliberately not deploying anywhere pending a hosting decision. Declared `packages/database`/`packages/auth` as ESM (`"type": "module"`) to fix a Vitest config-loading error — verified nothing else (Prisma CLI, tsx scripts, Next builds) broke.
- 2026-08-06 — Closed a real gap in Phase 5: the "Documentation tab" checkbox had been checked off but only ever rendered the flat README, not a project's real `docs/` folder. Added `listDocsPages()`/`getDocPage()` (`packages/github`) and two new routes, `/projects/[slug]/docs` (index) and `/projects/[slug]/docs/[page]` (single page with sidebar nav), all fetched live and never persisted — same principle as the README. Verified against the real `olgax-pos` repo: found and rendered all 8 real doc pages (`api-reference`, `architecture`, `configuration`, `contributing`, `deployment`, `getting-started`, `README`, `testing`) with no `GITHUB_SYNC_TOKEN` needed at all, since this uses the REST contents API (unlike Discussions, which needs GraphQL and therefore a token). Also fixed a latent bug this surfaced: `MarkdownContent` never resolved relative links/images against the source repo, so any relative reference in a README or doc page would 404 against our own domain — added a `linkBase` prop that rewrites relative links to `github.com/.../blob/...` and relative images to `raw.githubusercontent.com/...`, wired into both the README and the new doc pages.
- 2026-08-06 — User asked whether the docs app (`apps/docs`, port 3001) should also surface other projects' docs, then pointed me at the `apps/docs` folder directly to figure out how. Considered giving `apps/docs` its own `@olgax/database` dependency vs. a small public API — chose the API (`GET /api/projects` on `apps/web`) to keep `apps/docs` free of any DB/env coupling and independently deployable, consistent with its "pure docs-as-code" design. Added `/docs/projects` (Fumadocs page using the `Card`/`Cards` components, revalidated every 60s) plus a `links` entry so it's reachable from the sidebar on every docs page. Verified live end-to-end in-browser against the user's own already-running dev servers (ports 3000/3001) — real project card rendered correctly, linking out to `http://localhost:3000/projects/olgax-pos/docs`. While in `apps/docs/lib/shared.ts`, also fixed two leftover Fumadocs scaffold defaults that had never been updated: `appName` ("My App" → "Olgax Docs") and `gitConfig` (was pointing at `fuma-nama/fumadocs`, the Fumadocs library's own repo, instead of this platform's). Pointed it at `OLGAX-com/developer-portal` as a best guess — **unconfirmed, needs the user to correct it if this platform's repo has a different actual name or doesn't exist on GitHub yet**. Full workspace lint/typecheck/test/build (both apps) all pass.
- 2026-08-06 — User pushed back further: why not use `apps/docs`'s existing structure (search shell, TOC, sidebar, copy-as-markdown) for ALL docs, project docs included, instead of the plainer custom UI just built in `apps/web`? Agreed and moved the whole per-project doc *reading* experience into `apps/docs`: `/docs/projects/[slug]` (index) and `/docs/projects/[slug]/[page]` (single page), the latter with a real working TOC generated from live content via `fumadocs-core`'s own `getTableOfContents()` + `remarkHeading` (so heading ids match between the extracted TOC and the rendered content) — reused Fumadocs' own utilities rather than hand-rolling heading extraction. Added two new public `apps/web` endpoints mirroring the existing service functions (`GET /api/projects/[slug]/docs`, `GET /api/projects/[slug]/docs/[page]`) and **deleted** the now-superseded `apps/web` UI routes (`/projects/[slug]/docs`, `/projects/[slug]/docs/[page]`) plus updated the "View full documentation" link on `/projects/[slug]` to point at `apps/docs` instead — avoided keeping two parallel implementations. Added `react-markdown`+`remark-gfm` to `apps/docs` (new deps) with a local `ProjectDocContent` component mirroring `apps/web`'s `MarkdownContent` (same relative-link-resolution fix, plus `remarkHeading` for TOC support) — duplicated as a small component rather than extracting a new shared package, since it's the only thing two apps need so far. **Known limitation, called out to the user rather than silently built around**: Fumadocs' search (`/api/search`) is built from the static MDX content collection only — live project docs are browsable/linkable but not yet searchable through the same index; would need real extra work (a custom search source or on-demand indexing) to close that gap. Full lint/typecheck/build pass for both apps (had to regenerate a stale Next.js route-type cache after deleting the old apps/web routes, and reinstalled the workspace after adding the new deps — both routine).
- 2026-08-06 — User asked to go further still: make project docs appear *natively* in the sidebar tree (collapsible, like the existing "Modules" section), not just reachable via a Cards page. Built `apps/docs/lib/projects-tree.ts` (`getProjectsTreeNode()`): live-fetches tracked projects + their doc pages and constructs a real Fumadocs `PageTree.Folder` ("Projects" → one collapsible sub-folder per project → a page node per doc, each folder's `index` pointing at its own overview page). `app/docs/layout.tsx` is now `async`, merges this node into `source.getPageTree()`'s children (never mutating the shared static tree object directly — spreads into a new object each request) before passing it to `DocsLayout`. Removed the now-redundant flat `links: [{text: 'Projects', ...}]` nav entry added earlier, since the real tree folder supersedes it. Verified live: breadcrumbs on a project doc page now correctly read "Projects › olgax-pos" (breadcrumbs are derived from the exact same merged tree the sidebar uses, so this is strong evidence the sidebar entry itself is correct too). Trade-off worth knowing: since the shared docs layout now does a live fetch (cached, `revalidate: 60`), ALL platform doc pages under `/docs` moved from fully-static to 60s-revalidated in the production build output — a minor, accepted cost for live project nav. Degrades gracefully to the plain static tree if the fetch to apps/web fails (e.g. it's down), so platform docs stay usable either way. Full lint/typecheck/build pass. Not yet re-verified in-browser against the user's own running dev servers since those need a restart to pick up the new dependencies/node_modules.
