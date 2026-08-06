import { prisma } from "../client";

export interface LeaderboardEntry {
  githubUsername: string;
  name: string | null;
  image: string | null;
  xp: number;
  level: number;
  rank: number;
}

export async function getGlobalLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const profiles = await prisma.profile.findMany({
    where: { xp: { gt: 0 } },
    orderBy: { xp: "desc" },
    take: limit,
    include: { user: true },
  });

  return profiles.map((profile, index) => ({
    githubUsername: profile.githubUsername ?? profile.user.name,
    name: profile.user.name,
    image: profile.user.image,
    xp: profile.xp,
    level: profile.level,
    rank: index + 1,
  }));
}

export interface RepoLeaderboardEntry {
  githubUsername: string;
  mergedPullRequests: number;
  rank: number;
}

export async function getProjectLeaderboard(projectId: string, limit = 50): Promise<RepoLeaderboardEntry[]> {
  const grouped = await prisma.githubIssue.groupBy({
    by: ["authorLogin"],
    where: { projectId, isPullRequest: true, isMerged: true },
    _count: { authorLogin: true },
    orderBy: { _count: { authorLogin: "desc" } },
    take: limit,
  });

  return grouped.map((row, index) => ({
    githubUsername: row.authorLogin,
    mergedPullRequests: row._count.authorLogin,
    rank: index + 1,
  }));
}

export async function getMonthlyLeaderboard(limit = 50): Promise<RepoLeaderboardEntry[]> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const grouped = await prisma.githubIssue.groupBy({
    by: ["authorLogin"],
    where: { isPullRequest: true, isMerged: true, mergedAt: { gte: startOfMonth } },
    _count: { authorLogin: true },
    orderBy: { _count: { authorLogin: "desc" } },
    take: limit,
  });

  return grouped.map((row, index) => ({
    githubUsername: row.authorLogin,
    mergedPullRequests: row._count.authorLogin,
    rank: index + 1,
  }));
}
