import type { MissionType } from "@prisma/client";
import { prisma } from "../client";
import { awardXp } from "./xp-ledger";
import { awardBadge } from "./badges";
import { createNotification } from "./notifications";

/** Counts a contributor's synced GitHub activity relevant to one mission type. */
async function countActivityForMissionType(githubUsername: string, type: MissionType) {
  switch (type) {
    case "FIRST_PR":
      return prisma.githubIssue.count({
        where: { authorLogin: githubUsername, isPullRequest: true, isMerged: true },
      });
    case "BUG_FIX":
      return prisma.githubIssue.count({
        where: { authorLogin: githubUsername, isPullRequest: true, isMerged: true, labels: { has: "bug" } },
      });
    case "DOCUMENTATION":
      return prisma.githubIssue.count({
        where: {
          authorLogin: githubUsername,
          isPullRequest: true,
          isMerged: true,
          labels: { hasSome: ["documentation", "docs"] },
        },
      });
    case "TESTING":
      return prisma.githubIssue.count({
        where: {
          authorLogin: githubUsername,
          isPullRequest: true,
          isMerged: true,
          labels: { hasSome: ["test", "testing"] },
        },
      });
    case "CODE_REVIEW":
      return prisma.githubReview.count({ where: { reviewerLogin: githubUsername } });
    case "COMMUNITY_SUPPORT":
      // No synced signal for this yet (would need Discussions sync); never auto-completes.
      return 0;
    case "BUG_REPORT":
      // Rewards manual QA: running the app and filing a real GitHub issue, not just merged code.
      return prisma.githubIssue.count({
        where: { authorLogin: githubUsername, isPullRequest: false },
      });
  }
}

/** Re-checks every active mission for a user against their synced GitHub activity, completing and rewarding any newly-met ones. */
export async function checkAndCompleteMissions(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile?.githubUsername) return [];

  const missions = await prisma.mission.findMany({ where: { isActive: true }, include: { badge: true } });
  const newlyCompleted: string[] = [];

  for (const mission of missions) {
    const existing = await prisma.userMission.findUnique({
      where: { userId_missionId: { userId, missionId: mission.id } },
    });
    if (existing?.status === "COMPLETED") continue;

    const activityCount = await countActivityForMissionType(profile.githubUsername, mission.type);
    if (activityCount < 1) continue;

    const userMission = await prisma.userMission.upsert({
      where: { userId_missionId: { userId, missionId: mission.id } },
      create: { userId, missionId: mission.id, status: "COMPLETED", completedAt: new Date() },
      update: { status: "COMPLETED", completedAt: new Date() },
    });

    if (mission.xpReward > 0) {
      await awardXp({
        userId,
        amount: mission.xpReward,
        reason: `Completed mission: ${mission.title}`,
        sourceType: "UserMission",
        sourceId: userMission.id,
      });
    }
    if (mission.badge) await awardBadge(userId, mission.badge.slug);

    await createNotification({
      userId,
      type: "MISSION_COMPLETED",
      title: `Mission complete: ${mission.title}`,
      body: mission.xpReward > 0 ? `You earned ${mission.xpReward} XP.` : undefined,
    });

    newlyCompleted.push(mission.slug);
  }

  return newlyCompleted;
}

export function listMissionsForUser(userId: string) {
  return prisma.mission.findMany({
    where: { isActive: true },
    include: { badge: true, userMissions: { where: { userId } } },
    orderBy: { createdAt: "asc" },
  });
}
