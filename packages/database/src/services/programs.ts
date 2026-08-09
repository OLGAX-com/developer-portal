import { prisma } from "../client";
import { issueCertificate } from "./certificates";
import { createNotification } from "./notifications";

export function listPrograms() {
  return prisma.program.findMany({ where: { isActive: true }, orderBy: { durationMonths: "asc" } });
}

export function listProgramEnrollmentsForUser(userId: string) {
  return prisma.programEnrollment.findMany({
    where: { userId },
    include: { program: true },
    orderBy: { startedAt: "asc" },
  });
}

export async function enrollInProgram(userId: string, programSlug: string) {
  const program = await prisma.program.findUniqueOrThrow({ where: { slug: programSlug } });

  const existing = await prisma.programEnrollment.findUnique({
    where: { userId_programId: { userId, programId: program.id } },
  });
  if (!existing) {
    return prisma.programEnrollment.create({ data: { userId, programId: program.id } });
  }
  // Re-enrolling after leaving restarts the clock fresh, matching how declined mentorship requests reopen.
  if (existing.status === "CANCELLED") {
    return prisma.programEnrollment.update({
      where: { id: existing.id },
      data: { status: "IN_PROGRESS", startedAt: new Date(), completedAt: null, certificateId: null },
    });
  }
  return existing;
}

export async function unenrollFromProgram(userId: string, programId: string) {
  const enrollment = await prisma.programEnrollment.findUnique({
    where: { userId_programId: { userId, programId } },
  });
  if (!enrollment || enrollment.status !== "IN_PROGRESS") {
    throw new Error("You can only leave a program you're currently enrolled in.");
  }

  return prisma.programEnrollment.update({ where: { id: enrollment.id }, data: { status: "CANCELLED" } });
}

export interface ProgramActivityItem {
  id: string;
  number: number;
  title: string;
  url: string;
  projectName: string;
  date: Date;
}

export interface ProgramProgress {
  mergedPRs: ProgramActivityItem[];
  issuesOpened: ProgramActivityItem[];
  reviews: ProgramActivityItem[];
  totalXp: number;
  requiredEndsAt: Date;
  daysRemaining: number;
  durationElapsed: boolean;
  meetsRequirements: boolean;
}

/**
 * Tallies a contributor's LIFETIME synced GitHub activity against one program's requirements - not
 * just activity since enrollment, so contribution work someone already did still counts.
 * `requiredEndsAt`/`durationElapsed` describe the track's nominal length for display purposes only -
 * completion (see `checkAndCompletePrograms`) is based on `meetsRequirements` alone - the SAME XP
 * shown on a contributor's profile/leaderboard as the primary gate, with merged PR/issue/review
 * counts as additional hard requirements where set, not on waiting out the duration.
 */
export async function getProgramProgress(
  enrollment: { startedAt: Date },
  program: {
    minMergedPRs: number;
    minIssuesOpened: number;
    minReviews: number;
    minXp: number;
    durationMonths: number;
  },
  githubUsername: string | null,
  totalXp: number,
): Promise<ProgramProgress> {
  const requiredEndsAt = new Date(enrollment.startedAt);
  requiredEndsAt.setMonth(requiredEndsAt.getMonth() + program.durationMonths);

  const [mergedPRRows, issuesOpenedRows, reviewRows] = githubUsername
    ? await Promise.all([
        prisma.githubIssue.findMany({
          where: { authorLogin: githubUsername, isPullRequest: true, isMerged: true },
          include: { project: { select: { name: true } } },
          orderBy: { mergedAt: "desc" },
        }),
        prisma.githubIssue.findMany({
          where: { authorLogin: githubUsername, isPullRequest: false },
          include: { project: { select: { name: true } } },
          orderBy: { openedAt: "desc" },
        }),
        prisma.githubReview.findMany({
          where: { reviewerLogin: githubUsername },
          include: { issue: { include: { project: { select: { name: true } } } } },
          orderBy: { submittedAt: "desc" },
        }),
      ])
    : [[], [], []];

  const mergedPRs: ProgramActivityItem[] = mergedPRRows.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    projectName: pr.project.name,
    date: pr.mergedAt ?? pr.openedAt,
  }));
  const issuesOpened: ProgramActivityItem[] = issuesOpenedRows.map((issue) => ({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    url: issue.url,
    projectName: issue.project.name,
    date: issue.openedAt,
  }));
  const reviews: ProgramActivityItem[] = reviewRows.map((review) => ({
    id: review.id,
    number: review.issue.number,
    title: review.issue.title,
    url: review.issue.url,
    projectName: review.issue.project.name,
    date: review.submittedAt,
  }));

  return {
    mergedPRs,
    issuesOpened,
    reviews,
    totalXp,
    requiredEndsAt,
    daysRemaining: Math.max(0, Math.ceil((requiredEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))),
    durationElapsed: new Date() >= requiredEndsAt,
    meetsRequirements:
      totalXp >= program.minXp &&
      mergedPRs.length >= program.minMergedPRs &&
      issuesOpened.length >= program.minIssuesOpened &&
      reviews.length >= program.minReviews,
  };
}

/**
 * Re-checks every in-progress enrollment for a user, issuing a real certificate for any
 * newly-completed program - except programs marked `requiresApproval` (currently just
 * Maintainer), which move to PENDING_APPROVAL instead of auto-issuing (see
 * `approveProgramCompletion` for the admin/maintainer side of that).
 */
export async function checkAndCompletePrograms(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const enrollments = await prisma.programEnrollment.findMany({
    where: { userId, status: "IN_PROGRESS" },
    include: { program: true },
  });

  const newlyCompleted: string[] = [];

  for (const enrollment of enrollments) {
    const progress = await getProgramProgress(
      enrollment,
      enrollment.program,
      profile?.githubUsername ?? null,
      profile?.xp ?? 0,
    );
    if (!progress.meetsRequirements) continue;

    if (enrollment.program.requiresApproval) {
      await prisma.programEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "PENDING_APPROVAL" },
      });
      await createNotification({
        userId,
        type: "SYSTEM",
        title: `Eligible for ${enrollment.program.title}`,
        body: "You've met the requirements - a maintainer will review and approve your certificate.",
        link: "/programs",
      });
      newlyCompleted.push(enrollment.program.slug);
      continue;
    }

    const certificate = await issueCertificate({
      userId,
      title: enrollment.program.certificateTitle,
      achievements: buildAchievements(enrollment.program, progress),
    });

    await prisma.programEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "COMPLETED", completedAt: new Date(), certificateId: certificate.id },
    });

    await createNotification({
      userId,
      type: "SYSTEM",
      title: `Program complete: ${enrollment.program.title}`,
      body: "Your certificate is ready to view and share.",
      link: `/certificates/${certificate.id}`,
    });

    newlyCompleted.push(enrollment.program.slug);
  }

  return newlyCompleted;
}

function buildAchievements(
  program: { minMergedPRs: number; minIssuesOpened: number; minReviews: number; minXp: number },
  progress: ProgramProgress,
) {
  return [
    program.minXp > 0 ? `${progress.totalXp} XP` : null,
    program.minMergedPRs > 0 ? `${progress.mergedPRs.length} merged pull requests` : null,
    program.minIssuesOpened > 0 ? `${progress.issuesOpened.length} issues opened` : null,
    program.minReviews > 0 ? `${progress.reviews.length} code reviews` : null,
  ].filter((achievement): achievement is string => Boolean(achievement));
}

/**
 * Admin/maintainer-only: approves a PENDING_APPROVAL enrollment (currently only reachable for
 * Maintainer-tier programs), issuing the real certificate and completing the enrollment.
 */
export async function approveProgramCompletion(enrollmentId: string) {
  const enrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    include: { program: true },
  });
  if (enrollment.status !== "PENDING_APPROVAL") {
    throw new Error("This enrollment isn't awaiting approval.");
  }

  const profile = await prisma.profile.findUnique({ where: { userId: enrollment.userId } });
  const progress = await getProgramProgress(
    enrollment,
    enrollment.program,
    profile?.githubUsername ?? null,
    profile?.xp ?? 0,
  );

  const certificate = await issueCertificate({
    userId: enrollment.userId,
    title: enrollment.program.certificateTitle,
    achievements: buildAchievements(enrollment.program, progress),
  });

  await prisma.programEnrollment.update({
    where: { id: enrollment.id },
    data: { status: "COMPLETED", completedAt: new Date(), certificateId: certificate.id },
  });

  await createNotification({
    userId: enrollment.userId,
    type: "SYSTEM",
    title: `Program complete: ${enrollment.program.title}`,
    body: "Your certificate is ready to view and share.",
    link: `/certificates/${certificate.id}`,
  });

  return certificate;
}

/** All enrollments currently awaiting a maintainer/admin's manual approval, across all users. */
export function listPendingProgramApprovals() {
  return prisma.programEnrollment.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { program: true, user: { include: { profile: true } } },
    orderBy: { updatedAt: "asc" },
  });
}
