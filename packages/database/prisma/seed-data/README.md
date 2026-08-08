# Seed data

Data-driven definitions for badges, missions, and certification programs - kept as plain JSON
so they're easy to adjust (add a track, tweak a requirement, add a badge) without touching any
TypeScript. Edit the relevant file here, then re-run the seed to apply it:

```
pnpm --filter @olgax/database run db:seed
```

Seeding is an upsert keyed by `slug` - existing rows are updated in place, new slugs are
created, and nothing here is ever deleted automatically (remove a row's usage in the app first
if you really want to retire it).

- `badges.json` - `Badge` definitions (slug, name, description, icon).
- `missions.json` - `Mission` definitions (slug, title, description, `type` must match the
  `MissionType` enum in `prisma/schema.prisma`, `xpReward`, optional `badgeSlug` linking to a
  badge above).
- `programs.json` - certification `Program` tracks (slug, title, description, `motto`, `track`
  must match the `ProgramTrack` enum, `durationMonths`, `minMergedPRs`/`minIssuesOpened`/
  `minReviews` thresholds, `certificateTitle` shown on the issued certificate). Duration is
  descriptive/informational only - completion is based purely on meeting the thresholds
  (see `checkAndCompletePrograms()` in `src/services/programs.ts`).
