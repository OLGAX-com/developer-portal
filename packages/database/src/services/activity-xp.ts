import { prisma } from "../client";
import { XP_PER_MERGED_PR, XP_PER_ISSUE_OPENED, XP_PER_REVIEW } from "./xp";
import { awardXp } from "./xp-ledger";

/**
 * Awards ongoing XP for every merged PR, opened issue, and code review a user has that hasn't
 * been counted yet (`xpAwarded === 0`). Unlike missions (one-time milestones), this rewards
 * every unit of real GitHub activity, so XP keeps growing with contribution volume. Each award
 * also logs a real, human-readable XpEntry row (see xp-ledger.ts).
 */
export async function checkAndAwardActivityXp(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile?.githubUsername) return;

  const [mergedPRs, issuesOpened, reviews] = await Promise.all([
    prisma.githubIssue.findMany({
      where: { authorLogin: profile.githubUsername, isPullRequest: true, isMerged: true, xpAwarded: 0 },
      include: { project: { select: { name: true } } },
    }),
    prisma.githubIssue.findMany({
      where: { authorLogin: profile.githubUsername, isPullRequest: false, xpAwarded: 0 },
      include: { project: { select: { name: true } } },
    }),
    prisma.githubReview.findMany({
      where: { reviewerLogin: profile.githubUsername, xpAwarded: 0 },
      include: { issue: { include: { project: { select: { name: true } } } } },
    }),
  ]);

  for (const pr of mergedPRs) {
    await awardXp({
      userId,
      amount: XP_PER_MERGED_PR,
      reason: `Merged pull request #${pr.number} in ${pr.project.name}`,
      sourceType: "GithubIssue:merged",
      sourceId: pr.id,
    });
    await prisma.githubIssue.update({ where: { id: pr.id }, data: { xpAwarded: XP_PER_MERGED_PR } });
  }
  for (const issue of issuesOpened) {
    await awardXp({
      userId,
      amount: XP_PER_ISSUE_OPENED,
      reason: `Opened issue #${issue.number} in ${issue.project.name}`,
      sourceType: "GithubIssue:opened",
      sourceId: issue.id,
    });
    await prisma.githubIssue.update({ where: { id: issue.id }, data: { xpAwarded: XP_PER_ISSUE_OPENED } });
  }
  for (const review of reviews) {
    await awardXp({
      userId,
      amount: XP_PER_REVIEW,
      reason: `Reviewed pull request #${review.issue.number} in ${review.issue.project.name}`,
      sourceType: "GithubReview",
      sourceId: review.id,
    });
    await prisma.githubReview.update({ where: { id: review.id }, data: { xpAwarded: XP_PER_REVIEW } });
  }
}
