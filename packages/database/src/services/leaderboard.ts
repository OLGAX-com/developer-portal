import { prisma } from "../client";
import { calculateLevel, XP_PER_MERGED_PR, XP_PER_ISSUE_OPENED, XP_PER_REVIEW } from "./xp";

export interface LeaderboardEntry {
  githubUsername: string;
  name: string | null;
  image: string | null;
  xp: number;
  level: number;
  rank: number;
  // false = a real contributor synced from GitHub who hasn't signed in to claim their profile yet.
  isRegistered: boolean;
}

/**
 * Every contributor with synced GitHub activity earns a spot here, whether they've signed up on
 * the platform or not - a merged PR/issue/review is real credit regardless of registration status.
 * Registered contributors use their persisted `profile.xp` (kept fresh by `checkAndAwardActivityXp`
 * on their own page views); everyone else gets an equivalent XP computed live from the same rates.
 */
export async function getGlobalLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const profiles = await prisma.profile.findMany({
    where: { xp: { gt: 0 } },
    include: { user: true },
  });
  const registeredLogins = new Set(
    profiles.filter((profile) => profile.githubUsername).map((profile) => profile.githubUsername!),
  );

  const [mergedPRRows, issueRows, reviewRows] = await Promise.all([
    prisma.githubIssue.groupBy({
      by: ["authorLogin"],
      where: { isPullRequest: true, isMerged: true, NOT: { authorLogin: { endsWith: "[bot]" } } },
      _count: { authorLogin: true },
    }),
    prisma.githubIssue.groupBy({
      by: ["authorLogin"],
      where: { isPullRequest: false, NOT: { authorLogin: { endsWith: "[bot]" } } },
      _count: { authorLogin: true },
    }),
    prisma.githubReview.groupBy({
      by: ["reviewerLogin"],
      where: { NOT: { reviewerLogin: { endsWith: "[bot]" } } },
      _count: { reviewerLogin: true },
    }),
  ]);

  const unregisteredXp = new Map<string, number>();
  const addXp = (login: string, amount: number) => {
    if (registeredLogins.has(login)) return;
    unregisteredXp.set(login, (unregisteredXp.get(login) ?? 0) + amount);
  };
  for (const row of mergedPRRows) addXp(row.authorLogin, row._count.authorLogin * XP_PER_MERGED_PR);
  for (const row of issueRows) addXp(row.authorLogin, row._count.authorLogin * XP_PER_ISSUE_OPENED);
  for (const row of reviewRows) addXp(row.reviewerLogin, row._count.reviewerLogin * XP_PER_REVIEW);

  const registeredEntries: LeaderboardEntry[] = profiles.map((profile) => ({
    githubUsername: profile.githubUsername ?? profile.user.name,
    name: profile.user.name,
    image: profile.user.image,
    xp: profile.xp,
    level: profile.level,
    rank: 0,
    isRegistered: true,
  }));

  const unregisteredEntries: LeaderboardEntry[] = Array.from(unregisteredXp.entries()).map(([login, xp]) => ({
    githubUsername: login,
    name: login,
    image: null,
    xp,
    level: calculateLevel(xp).level,
    rank: 0,
    isRegistered: false,
  }));

  return [...registeredEntries, ...unregisteredEntries]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}


/** A user's global rank by XP - null if they haven't earned any XP yet (not on the board). */
export async function getUserRank(userId: string): Promise<number | null> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile || profile.xp <= 0) return null;

  const higherRanked = await prisma.profile.count({ where: { xp: { gt: profile.xp } } });
  return higherRanked + 1;
}

export interface UniversityLeaderboardEntry {
  university: string;
  totalXp: number;
  contributorCount: number;
  rank: number;
}

/** Ranks universities by the combined XP of contributors who listed one on their profile. */
export async function getUniversityLeaderboard(limit = 50): Promise<UniversityLeaderboardEntry[]> {
  const grouped = await prisma.profile.groupBy({
    by: ["university"],
    where: { university: { not: null }, xp: { gt: 0 } },
    _sum: { xp: true },
    _count: { university: true },
    orderBy: { _sum: { xp: "desc" } },
    take: limit,
  });

  return grouped
    .filter((row): row is typeof row & { university: string } => Boolean(row.university))
    .map((row, index) => ({
      university: row.university,
      totalXp: row._sum.xp ?? 0,
      contributorCount: row._count.university,
      rank: index + 1,
    }));
}

export interface RepoLeaderboardEntry {
  githubUsername: string;
  name: string | null;
  image: string | null;
  mergedPullRequests: number;
  rank: number;
  isRegistered: boolean;
}

/** Joins profile name/avatar onto rows grouped by GitHub login, for consistent rendering with the global leaderboard. */
async function attachProfiles(
  rows: { authorLogin: string; _count: { authorLogin: number } }[],
): Promise<RepoLeaderboardEntry[]> {
  const profiles = await prisma.profile.findMany({
    where: { githubUsername: { in: rows.map((row) => row.authorLogin) } },
    include: { user: true },
  });
  const byLogin = new Map(profiles.map((profile) => [profile.githubUsername, profile]));

  return rows.map((row, index) => {
    const profile = byLogin.get(row.authorLogin);
    return {
      githubUsername: row.authorLogin,
      name: profile?.user.name ?? row.authorLogin,
      image: profile?.user.image ?? null,
      mergedPullRequests: row._count.authorLogin,
      rank: index + 1,
      isRegistered: Boolean(profile),
    };
  });
}

export async function getProjectLeaderboard(projectId: string, limit = 50): Promise<RepoLeaderboardEntry[]> {
  const grouped = await prisma.githubIssue.groupBy({
    by: ["authorLogin"],
    where: { projectId, isPullRequest: true, isMerged: true, NOT: { authorLogin: { endsWith: "[bot]" } } },
    _count: { authorLogin: true },
    orderBy: { _count: { authorLogin: "desc" } },
    take: limit,
  });

  return attachProfiles(grouped);
}

export async function getMonthlyLeaderboard(limit = 50): Promise<RepoLeaderboardEntry[]> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const grouped = await prisma.githubIssue.groupBy({
    by: ["authorLogin"],
    where: {
      isPullRequest: true,
      isMerged: true,
      mergedAt: { gte: startOfMonth },
      NOT: { authorLogin: { endsWith: "[bot]" } },
    },
    _count: { authorLogin: true },
    orderBy: { _count: { authorLogin: "desc" } },
    take: limit,
  });

  return attachProfiles(grouped);
}
