# Onboarding, Mentor Verification & Community Engagement — Sub-plan

> Internal build-tracking notes for this repo, not user-facing documentation — see `apps/docs` for that.

A focused sub-plan for making contributor onboarding instant + gamified, adding a real mentor
application/verification workflow, and connecting community spaces. Cross-referenced from the
main [.planning/plan.md](./plan.md) (mainly touches Phase 4, 6, 8).

## How to use this document

Same convention as the main plan: check off `- [x]` when merged and working, add a one-line dated
note for decisions/gotchas.

---

## Design decisions

- **Roles stay as-is.** The existing hierarchy (`VISITOR < CONTRIBUTOR < MENTOR < MAINTAINER < ADMINISTRATOR`)
  already means a Mentor (or Maintainer/Administrator) passes every "is at least a Contributor" check.
  A mentor **is** a contributor; nothing to change there. What's missing is a real in-app path to
  *become* a mentor instead of only the CLI `promote` script.
- **Contributor onboarding is instant.** Sign in (GitHub/Google) → `Profile` auto-created →
  immediate access to the dashboard, projects, and the task board. No approval step.
- **Mentor status requires manual admin approval.** A signed-in user can apply; an Administrator
  reviews and approves/rejects. Approval promotes their `Role` to `MENTOR` (unless they already
  outrank it).
- **No custom forum.** GitHub Discussions (`github.com/orgs/OLGAX-com/discussions`) and the
  official Discord (`discord.com/invite/EAXcCXgUz2`) already exist and cover this need — building a bespoke
  forum would duplicate GitHub for no real benefit. Link both prominently instead. Revisit only if
  there's a concrete reason GitHub Discussions/Discord don't work for the community later.
- **Issue "assignment" is a local claim, not a real GitHub assignment.** Most contributors don't
  have write access to tracked repos, so the platform can't actually assign a GitHub issue to them.
  Instead: track intent-to-work-on in our own DB (`TaskClaim`) and deep-link to the real GitHub
  issue so they can comment/get assigned there by a maintainer. GitHub remains the source of truth
  for who's actually assigned.
- **Onboarding "journey" steps are a mix of auto-verified and self-reported.** GitHub-activity
  steps (first PR, first review, docs) reuse the existing Mission system and auto-complete from
  synced data. "Said hello in Discussions" and "Joined Discord" are both verified live (GitHub
  GraphQL and Discord OAuth respectively) instead of self-reported - see Phase E/F.

---

## Phase A — Mentor application & admin verification

- [x] `MentorApplication` model (`message`, `status: PENDING/APPROVED/REJECTED`, `reviewNote`, `reviewedAt`)
- [x] `applyForMentorship(userId, message)` — blocks a second pending application
- [x] `approveMentorApplication` / `rejectMentorApplication` — approval promotes `Role` to `MENTOR` (only if not already higher), both notify the applicant
- [x] "Apply to become a mentor" UI on `/mentorship` (shows current status: none / pending / rejected-can-reapply / already a mentor)
- [x] `/admin/mentor-applications` review queue, Administrator-only, Approve/Reject actions

## Phase B — Contributor dashboard & gamified onboarding journey

- [x] `/dashboard` — the real post-sign-in home: onboarding checklist, XP/level summary, quick links (Projects, Task Board, Missions, Mentorship)
- [x] `OnboardingStep` model + `markOnboardingStepComplete(userId, key)` for self-reported steps
- [x] Onboarding checklist UI combining: GitHub linked (auto), first mission progress (auto, reuses Missions), joined Discord (self-report), said hello in Discussions (self-report)
- [x] Nav link to `/dashboard` for signed-in users

## Phase C — Task board (browse & claim open issues)

- [x] `TaskClaim` model (`userId`, `issueId`, `claimedAt`, `releasedAt`) — one active claimant per issue
- [x] `claimIssue` / `releaseIssueClaim` / `getActiveClaimForIssue` services
- [x] Task board view: open (non-PR) issues across all tracked projects, filterable by project
  - 2026-08-06: shipped as `/tasks`; per-project filtering not built yet (shows all projects together) — small follow-up if the task list grows.
- [x] Claim / Release button per issue on the task board and on the project detail page; claimed issues link out to the real GitHub issue

## Phase D — Community links

- [x] Discord invite link (`discord.com/invite/EAXcCXgUz2`) in footer + dashboard
- [x] GitHub Discussions link (`github.com/orgs/OLGAX-com/discussions`) in footer + dashboard
- [ ] (Deferred, not building now) Custom in-app forum/chat — only revisit if Discussions/Discord prove insufficient

## Phase E — Admin user management, richer applications, GitHub assignees & task discussions

- [x] `/admin/users` — Administrator-only page listing every user with a per-role button to assign/deassign roles (`updateUserRole`); an admin can't demote themselves away from `ADMINISTRATOR`
- [x] `Profile` extended with `age`, `location`, `linkedinUrl` (reused across both `MentorApplication` review and `Mentorship` request views instead of duplicating fields per-model); editable by the user on `/profile`
- [x] Mentor application review (`/admin/mentor-applications`) and mentorship request cards now show the applicant/requester's profile details (university/location/age, LinkedIn link, bio)
- [x] **Bug fix**: `requestMentorship` previously returned the stale existing row forever once ANY mentorship row existed for a mentor/student pair — a decline permanently blocked re-requesting. Now a `DECLINED`/`CANCELLED` row is reset back to `PENDING` with the new message on re-request, and the UI shows a reapply form (prefilled with the previous message) instead of a dead status badge.
- [x] **Bug fix** (found via testing this phase's own verification script): `claimIssue` used a plain `create()`, which violated the `@@unique([issueId, userId])` constraint if the same user had claimed-then-released that issue before — meaning nobody could ever reclaim an issue they'd previously released. Switched to `upsert` keyed on `issueId_userId` so re-claiming (by the original claimant or anyone else) works correctly.
- [x] GitHub sync now captures real `assignees` (logins) per issue/PR (`GithubIssue.assignees String[]`); task board, task detail page, and project detail page all show "Assigned on GitHub to @login" when present, and issue titles link into our own `/tasks/[issueId]` detail page rather than straight to GitHub
- [x] Task board claims now show elapsed time since claim (`formatRelativeTime`) so a stale/forgotten claim is visible at a glance
- [x] `TaskComment` model + `/tasks/[issueId]` discussion thread (add/list comments) — a lightweight "are you still working on this?" thread per issue, without duplicating GitHub's own comment feature
- [x] `forceReleaseIssueClaim` — lets a Maintainer/Administrator (or that project's maintainer) release someone else's stale claim from the task detail page, surfaced as a distinct "Release (maintainer)" action separate from the claimant's own "Release"

## Phase F — Real verification for "Said hello in Discussions" and "Joined Discord"

- [x] `hasUserPostedInOrgDiscussions(org, githubLogin)` (`packages/github`) — live GraphQL query against every public repo in a GitHub org that has Discussions enabled (discussion authors + comment authors), never persisted. Matches the real `github.com/orgs/<org>/discussions` aggregate view rather than checking only the repo(s) we happen to track as Projects.
- [x] Dashboard "Say hello in GitHub Discussions" checklist item calls a real `verifySaidHelloInDiscussions` server action instead of a self-report button: derives the distinct GitHub org(s) behind our tracked projects, checks org-wide Discussions for a post/comment by the signed-in user's stored `githubUsername`, only marks the `OnboardingStep` done if actually found, and shows a result banner ("verified" / "not found yet, go post" / "link GitHub first")
- [x] **Bug fix** (found via testing this feature): unauthenticated GitHub GraphQL calls come back as a 403 that `@octokit/plugin-throttling` misclassifies as a rate limit, and the client's `onRateLimit`/`onSecondaryRateLimit` handlers would retry for GitHub's full backoff window (~1hr+) up to 3 times each — meaning a single "Check now" click could hang for hours. `createGithubClient` now takes a `{ retryRateLimits }` option (default `true` for background sync jobs); `hasUserPostedInOrgDiscussions` passes `false` so this interactive check fails fast (~1s) and just reports "not found" instead of hanging. Also fixed `onSecondaryRateLimit` to actually respect a retry cap (`retryCount < 3`) — it previously always returned `true` (infinite retries) regardless of outcome.
- [ ] **Requires `GITHUB_SYNC_TOKEN` to actually verify anything** — confirmed by testing against the real API: GitHub's GraphQL API (unlike REST) rejects ALL unauthenticated requests, so without a real token this check will always report "not found," even for real posts. No token is currently set in any local env file (user confirmed hitting exactly this on 2026-08-06 after posting a real discussion + replies). Sync (REST) still works unauthenticated at a low rate; Discussions verification (GraphQL) does not work at all without a token.
- [x] **"Joined Discord" real verification, built via per-user Discord OAuth** (`identify`+`guilds` scopes, no bot required): `/api/discord/authorize` (generates CSRF `state`, redirects to Discord) → user approves → `/api/discord/callback` (verifies `state`, exchanges code for a token, calls `GET /users/@me/guilds`, resolves our server's real guild id from the public invite-info endpoint using the invite code already centralized in `COMMUNITY_LINKS.discord` — no separate guild-id env var needed) → marks `OnboardingStep` done only if the guild id is actually in the user's guild list. Verified the invite-resolution step against the real invite (`discord.com/invite/EAXcCXgUz2` → real guild id `1508695137520324701`, "Olgax Community"). Real `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` have since been added to `apps/web/.env.local` by the user — not yet end-to-end tested (requires an interactive Discord consent grant only the user can complete).

---

## Progress Log

- 2026-08-06 — Sub-plan created from a live discussion about mentor verification, gamified onboarding, and community links. Design decisions above locked in before starting Phase A.
- 2026-08-06 — Phases A–D built and verified end-to-end against real data (not just compiled): applied for mentorship as the seed contributor, approved it, confirmed role promotion to MENTOR; tracked an onboarding step; claimed and released a real open issue from `olgax-pos`. Test data cleaned up afterward (seed contributor reverted to CONTRIBUTOR). Full workspace lint/typecheck/test/build all pass.
- 2026-08-06 — Phase E built from direct user bug reports (mentorship request getting permanently stuck after a decline) plus a mega-request for admin user management, richer application details, real GitHub assignee visibility, and task discussion threads. Verified end-to-end with a throwaway script: reproduced the exact reported bug (request → decline → stuck), confirmed the fix resets to `PENDING` and lets the user re-request with a new message; confirmed profile field updates, admin role changes, task comments, and force-release all work against real DB rows. Also caught and fixed a second, previously-unreported bug in the same area (`claimIssue` unique-constraint violation on reclaim) purely from writing the verification script — worth remembering that these throwaway end-to-end scripts pay for themselves by surfacing bugs the type checker can't catch. Full workspace lint/typecheck/test/build all pass; test data cleaned up.
- 2026-08-06 — Phase F: replaced the self-reported "said hello in Discussions" checkbox with a real GraphQL check. Testing it against the real API surfaced two real bugs before this ever reached a user: (1) unauthenticated GraphQL calls get misclassified as a rate limit and would've retried for hours on a single button click — fixed by adding a fail-fast client mode; (2) `onSecondaryRateLimit` never actually capped its retries — fixed to match `onRateLimit`'s cap. Also confirmed via live testing that this check is a no-op ("always reports not found") until a real `GITHUB_SYNC_TOKEN` is configured, since GitHub's GraphQL API (unlike REST) has no unauthenticated tier at all. Asked the user how to handle Discord verification (OAuth vs bot vs skip); they chose per-user OAuth. Built `/api/discord/authorize` + `/api/discord/callback`, with CSRF `state` protection and guild-id resolved live from the existing public invite link (no new guild-id env var). Verified the invite-resolution call against the real Discord invite. Full workspace lint/typecheck/test/build all pass. Not yet end-to-end tested with a real Discord OAuth app since `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` aren't set yet — pending the user creating the Discord application.
- 2026-08-06 — User hit the predicted `GITHUB_SYNC_TOKEN`-missing wall immediately after posting a real discussion + replies (`?discussionCheck=notfound`), confirming the earlier finding rather than revealing a new bug. While explaining, user also added real `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` to `apps/web/.env.local` and asked to broaden Discussions checking to the whole org, not just tracked repos (in case a post lands on an untracked repo). Replaced the per-repo `hasUserPostedInDiscussions(owner, repo, login)` with org-wide `hasUserPostedInOrgDiscussions(org, login)`, which walks every public repo in the org via `organization(login) { repositories { ... hasDiscussionsEnabled, discussions { ... } } }` and checks each one with Discussions enabled. The dashboard action now derives the distinct org(s) from tracked projects' `githubOwner` instead of a hardcoded org string, so it still generalizes if projects from other orgs are tracked later. Could not verify the exact GraphQL field names (`hasDiscussionsEnabled`, `repositories(privacy: PUBLIC)`) against a live schema since GraphQL requires auth (same blocker as above) and GitHub's GraphQL docs site doesn't render statically for fetching — confident in them from established GitHub schema naming conventions, but this is the one part still unverified against the real API; the code fails safe (catches errors, logs a warning, returns `false`) either way. Full workspace lint/typecheck/test/build all pass.
