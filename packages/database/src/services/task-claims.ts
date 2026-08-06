import { prisma } from "../client";

export async function claimIssue(userId: string, issueId: string) {
  const activeClaim = await prisma.taskClaim.findFirst({
    where: { issueId, releasedAt: null },
  });
  if (activeClaim && activeClaim.userId !== userId) {
    throw new Error("This issue is already claimed by someone else.");
  }
  if (activeClaim) return activeClaim;

  // A row for this (issue, user) pair may already exist from a previous claim
  // that was later released - reuse it instead of inserting a duplicate, which
  // would violate the @@unique([issueId, userId]) constraint.
  return prisma.taskClaim.upsert({
    where: { issueId_userId: { issueId, userId } },
    create: { userId, issueId },
    update: { claimedAt: new Date(), releasedAt: null },
  });
}

export function releaseIssueClaim(userId: string, issueId: string) {
  return prisma.taskClaim.updateMany({
    where: { userId, issueId, releasedAt: null },
    data: { releasedAt: new Date() },
  });
}

/** For maintainers/admins to free up a claim someone went quiet on - authorize before calling. */
export function forceReleaseIssueClaim(issueId: string) {
  return prisma.taskClaim.updateMany({
    where: { issueId, releasedAt: null },
    data: { releasedAt: new Date() },
  });
}

export function getActiveClaimForIssue(issueId: string) {
  return prisma.taskClaim.findFirst({
    where: { issueId, releasedAt: null },
    include: { user: true },
  });
}

export function getTaskDetail(issueId: string) {
  return prisma.githubIssue.findUnique({
    where: { id: issueId },
    include: {
      project: true,
      claims: { include: { user: true }, orderBy: { claimedAt: "desc" } },
    },
  });
}

/** Open, unclaimed, non-PR issues across every tracked project - the task board. */
export async function listOpenTasks() {
  const issues = await prisma.githubIssue.findMany({
    where: { isPullRequest: false, state: "open" },
    include: {
      project: true,
      claims: { where: { releasedAt: null }, include: { user: true } },
    },
    orderBy: { openedAt: "desc" },
  });

  return issues.map((issue) => ({ ...issue, activeClaim: issue.claims[0] ?? null }));
}
