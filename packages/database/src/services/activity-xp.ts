import { prisma } from "../client";
import { addXp } from "./profile";
import { XP_PER_MERGED_PR, XP_PER_ISSUE_OPENED, XP_PER_REVIEW } from "./xp";

/**
 * Awards ongoing XP for every merged PR, opened issue, and code review a user has that hasn't
 * been counted yet (`xpAwarded === 0`). Unlike missions (one-time milestones), this rewards
 * every unit of real GitHub activity, so XP keeps growing with contribution volume.
 */
export async function checkAndAwardActivityXp(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile?.githubUsername) return;

  const [mergedPRs, issuesOpened, reviews] = await Promise.all([
    prisma.githubIssue.findMany({
      where: { authorLogin: profile.githubUsername, isPullRequest: true, isMerged: true, xpAwarded: 0 },
      select: { id: true },
    }),
    prisma.githubIssue.findMany({
      where: { authorLogin: profile.githubUsername, isPullRequest: false, xpAwarded: 0 },
      select: { id: true },
    }),
    prisma.githubReview.findMany({
      where: { reviewerLogin: profile.githubUsername, xpAwarded: 0 },
      select: { id: true },
    }),
  ]);

  for (const { id } of mergedPRs) {
    await addXp(userId, XP_PER_MERGED_PR);
    await prisma.githubIssue.update({ where: { id }, data: { xpAwarded: XP_PER_MERGED_PR } });
  }
  for (const { id } of issuesOpened) {
    await addXp(userId, XP_PER_ISSUE_OPENED);
    await prisma.githubIssue.update({ where: { id }, data: { xpAwarded: XP_PER_ISSUE_OPENED } });
  }
  for (const { id } of reviews) {
    await addXp(userId, XP_PER_REVIEW);
    await prisma.githubReview.update({ where: { id }, data: { xpAwarded: XP_PER_REVIEW } });
  }
}
