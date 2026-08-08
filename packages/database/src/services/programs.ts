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
  requiredEndsAt: Date;
  daysRemaining: number;
  durationElapsed: boolean;
  meetsRequirements: boolean;
}

/**
 * Tallies a contributor's LIFETIME synced GitHub activity against one program's requirements - not
 * just activity since enrollment, so contribution work someone already did still counts.
 * `requiredEndsAt`/`durationElapsed` describe the track's nominal length for display purposes only -
 * completion (see `checkAndCompletePrograms`) is based on `meetsRequirements` alone, not on waiting
 * out the duration, so finishing the requirements early earns the certificate immediately.
 */
export async function getProgramProgress(
  enrollment: { startedAt: Date },
  program: { minMergedPRs: number; minIssuesOpened: number; minReviews: number; durationMonths: number },
  githubUsername: string | null,
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
    requiredEndsAt,
    daysRemaining: Math.max(0, Math.ceil((requiredEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))),
    durationElapsed: new Date() >= requiredEndsAt,
    meetsRequirements:
      mergedPRs.length >= program.minMergedPRs &&
      issuesOpened.length >= program.minIssuesOpened &&
      reviews.length >= program.minReviews,
  };
}

/** Re-checks every in-progress enrollment for a user, issuing a real certificate for any newly-completed program. */
export async function checkAndCompletePrograms(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const enrollments = await prisma.programEnrollment.findMany({
    where: { userId, status: "IN_PROGRESS" },
    include: { program: true },
  });

  const newlyCompleted: string[] = [];

  for (const enrollment of enrollments) {
    const progress = await getProgramProgress(enrollment, enrollment.program, profile?.githubUsername ?? null);
    if (!progress.meetsRequirements) continue;

    const achievements = [
      enrollment.program.minMergedPRs > 0 ? `${progress.mergedPRs.length} merged pull requests` : null,
      enrollment.program.minIssuesOpened > 0 ? `${progress.issuesOpened.length} issues opened` : null,
      enrollment.program.minReviews > 0 ? `${progress.reviews.length} code reviews` : null,
    ].filter((achievement): achievement is string => Boolean(achievement));

    const certificate = await issueCertificate({
      userId,
      title: enrollment.program.certificateTitle,
      achievements,
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
