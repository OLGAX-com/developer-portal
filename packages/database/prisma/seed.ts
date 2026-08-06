import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Data-driven badge & mission definitions - the platform's award/completion logic
// (packages/database/src/services) never hardcodes a badge or mission by name.
const BADGES = [
  { slug: "first-pr", name: "First PR", description: "Merged your first pull request", icon: "git-pull-request" },
  { slug: "top-reviewer", name: "Top Reviewer", description: "Reviewed multiple pull requests", icon: "message-square" },
  { slug: "bug-hunter", name: "Bug Hunter", description: "Fixed a confirmed bug", icon: "bug" },
  { slug: "documentation-hero", name: "Documentation Hero", description: "Improved project documentation", icon: "book-open" },
  { slug: "community-helper", name: "Community Helper", description: "Helped others in discussions or issues", icon: "heart-handshake" },
  { slug: "mentor", name: "Mentor", description: "Mentored a contributor to graduation", icon: "graduation-cap" },
  { slug: "maintainer", name: "Maintainer", description: "Maintains a project in the Olgax ecosystem", icon: "shield" },
] as const;

const MISSIONS = [
  {
    slug: "ship-your-first-pr",
    title: "Ship your first PR",
    description: "Open and get a pull request merged in any tracked Olgax project.",
    type: "FIRST_PR",
    xpReward: 150,
    badgeSlug: "first-pr",
  },
  {
    slug: "write-the-docs",
    title: "Write the docs",
    description: "Improve documentation for a project you use.",
    type: "DOCUMENTATION",
    xpReward: 100,
    badgeSlug: "documentation-hero",
  },
  {
    slug: "squash-a-bug",
    title: "Squash a bug",
    description: "Get a bug-fix pull request merged.",
    type: "BUG_FIX",
    xpReward: 120,
    badgeSlug: "bug-hunter",
  },
  {
    slug: "add-test-coverage",
    title: "Add test coverage",
    description: "Get a testing-focused pull request merged.",
    type: "TESTING",
    xpReward: 100,
    badgeSlug: null,
  },
  {
    slug: "review-a-pull-request",
    title: "Review a pull request",
    description: "Leave a review on someone else's pull request.",
    type: "CODE_REVIEW",
    xpReward: 80,
    badgeSlug: "top-reviewer",
  },
  {
    slug: "help-the-community",
    title: "Help the community",
    description: "Answer a question or help a fellow contributor.",
    type: "COMMUNITY_SUPPORT",
    xpReward: 60,
    badgeSlug: "community-helper",
  },
] as const;

async function main() {
  for (const badge of BADGES) {
    await prisma.badge.upsert({ where: { slug: badge.slug }, create: badge, update: badge });
  }

  for (const mission of MISSIONS) {
    const badge = mission.badgeSlug ? await prisma.badge.findUnique({ where: { slug: mission.badgeSlug } }) : null;
    await prisma.mission.upsert({
      where: { slug: mission.slug },
      create: {
        slug: mission.slug,
        title: mission.title,
        description: mission.description,
        type: mission.type,
        xpReward: mission.xpReward,
        badgeId: badge?.id,
      },
      update: {
        title: mission.title,
        description: mission.description,
        xpReward: mission.xpReward,
        badgeId: badge?.id,
      },
    });
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@olgax.dev" },
    update: {},
    create: {
      name: "Olgax Admin",
      email: "admin@olgax.dev",
      emailVerified: true,
      role: "ADMINISTRATOR",
      profile: { create: { githubUsername: "olgax-admin" } },
    },
  });

  const contributor = await prisma.user.upsert({
    where: { email: "contributor@olgax.dev" },
    update: {},
    create: {
      name: "Sample Contributor",
      email: "contributor@olgax.dev",
      emailVerified: true,
      role: "CONTRIBUTOR",
      profile: { create: { githubUsername: "sample-contributor", xp: 50, level: 2 } },
    },
  });

  console.log({ badges: BADGES.length, missions: MISSIONS.length, admin: admin.email, contributor: contributor.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
