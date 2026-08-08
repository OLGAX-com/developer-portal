import { prisma } from "../client";
import { calculateLevel, XP_PER_MERGED_PR, XP_PER_ISSUE_OPENED, XP_PER_REVIEW } from "./xp";

export interface ContributorActivityItem {
  id: string;
  number: number;
  title: string;
  url: string;
  projectName: string;
}

export interface ContributorProfile {
  githubUsername: string;
  name: string;
  image: string | null;
  // false = this GitHub login has real synced activity but hasn't signed in to claim a profile yet.
  isRegistered: boolean;
  userId: string | null;
  xp: number;
  level: number;
  mergedPRs: ContributorActivityItem[];
  issuesOpened: ContributorActivityItem[];
  reviews: ContributorActivityItem[];
}

/**
 * A public contributor profile keyed by GitHub username, not by platform user id - so it works
 * identically for registered members and for contributors who've only ever interacted via GitHub.
 * Returns null only if the login has neither a platform profile nor any synced activity at all.
 */
export async function getContributorProfile(githubUsername: string): Promise<ContributorProfile | null> {
  const [profile, mergedPRs, issuesOpened, reviews] = await Promise.all([
    prisma.profile.findFirst({ where: { githubUsername }, include: { user: true } }),
    prisma.githubIssue.findMany({
      where: { authorLogin: githubUsername, isPullRequest: true, isMerged: true },
      include: { project: true },
      orderBy: { mergedAt: "desc" },
    }),
    prisma.githubIssue.findMany({
      where: { authorLogin: githubUsername, isPullRequest: false },
      include: { project: true },
      orderBy: { openedAt: "desc" },
    }),
    prisma.githubReview.findMany({
      where: { reviewerLogin: githubUsername },
      include: { issue: { include: { project: true } } },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  if (!profile && mergedPRs.length === 0 && issuesOpened.length === 0 && reviews.length === 0) return null;

  const xp =
    profile?.xp ??
    mergedPRs.length * XP_PER_MERGED_PR + issuesOpened.length * XP_PER_ISSUE_OPENED + reviews.length * XP_PER_REVIEW;

  return {
    githubUsername,
    name: profile?.user.name ?? githubUsername,
    image: profile?.user.image ?? null,
    isRegistered: Boolean(profile),
    userId: profile?.userId ?? null,
    xp,
    level: profile?.level ?? calculateLevel(xp).level,
    mergedPRs: mergedPRs.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      url: issue.url,
      projectName: issue.project.name,
    })),
    issuesOpened: issuesOpened.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      url: issue.url,
      projectName: issue.project.name,
    })),
    reviews: reviews.map((review) => ({
      id: review.id,
      number: review.issue.number,
      title: review.issue.title,
      url: review.issue.url,
      projectName: review.issue.project.name,
    })),
  };
}
