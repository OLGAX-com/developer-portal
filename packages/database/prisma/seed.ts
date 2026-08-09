import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, type MissionType, type ProgramTrack } from "@prisma/client";

const prisma = new PrismaClient();
const seedDataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "seed-data");

function loadSeedData<T>(filename: string): T {
  return JSON.parse(readFileSync(path.join(seedDataDir, filename), "utf-8")) as T;
}

interface BadgeSeed {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

interface MissionSeed {
  slug: string;
  title: string;
  description: string;
  type: MissionType;
  xpReward: number;
  badgeSlug: string | null;
}

interface ProgramSeed {
  slug: string;
  title: string;
  description: string;
  motto: string;
  track: ProgramTrack;
  durationMonths: number;
  minMergedPRs: number;
  minIssuesOpened: number;
  minReviews: number;
  minXp: number;
  requiresApproval: boolean;
  certificateTitle: string;
}

// Data-driven badge, mission, and program definitions live as plain JSON in ./seed-data - see
// that folder's README. The platform's award/completion logic (packages/database/src/services)
// never hardcodes a badge, mission, or program by name.
const BADGES = loadSeedData<BadgeSeed[]>("badges.json");
const MISSIONS = loadSeedData<MissionSeed[]>("missions.json");
const PROGRAMS = loadSeedData<ProgramSeed[]>("programs.json");

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

  for (const program of PROGRAMS) {
    await prisma.program.upsert({
      where: { slug: program.slug },
      create: program,
      update: program,
    });
  }

  console.log({
    badges: BADGES.length,
    missions: MISSIONS.length,
    programs: PROGRAMS.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
