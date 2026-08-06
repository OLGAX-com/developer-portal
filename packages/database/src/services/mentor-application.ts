import { prisma } from "../client";
import { createNotification } from "./notifications";

export async function applyForMentorship(userId: string, message: string) {
  const existingPending = await prisma.mentorApplication.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (existingPending) return existingPending;

  return prisma.mentorApplication.create({ data: { userId, message } });
}

export function getLatestMentorApplication(userId: string) {
  return prisma.mentorApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function listPendingMentorApplications() {
  return prisma.mentorApplication.findMany({
    where: { status: "PENDING" },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: "asc" },
  });
}

const ROLE_RANK = { VISITOR: 0, CONTRIBUTOR: 1, MENTOR: 2, MAINTAINER: 3, ADMINISTRATOR: 4 } as const;

export async function approveMentorApplication(applicationId: string, reviewNote?: string) {
  const application = await prisma.mentorApplication.update({
    where: { id: applicationId },
    data: { status: "APPROVED", reviewNote, reviewedAt: new Date() },
    include: { user: true },
  });

  // Don't demote someone who already outranks MENTOR (a Maintainer/Administrator).
  if (ROLE_RANK[application.user.role] < ROLE_RANK.MENTOR) {
    await prisma.user.update({ where: { id: application.userId }, data: { role: "MENTOR" } });
  }

  await createNotification({
    userId: application.userId,
    type: "SYSTEM",
    title: "Your mentor application was approved",
    body: "You can now accept mentorship requests from contributors.",
  });

  return application;
}

export async function rejectMentorApplication(applicationId: string, reviewNote?: string) {
  const application = await prisma.mentorApplication.update({
    where: { id: applicationId },
    data: { status: "REJECTED", reviewNote, reviewedAt: new Date() },
  });

  await createNotification({
    userId: application.userId,
    type: "SYSTEM",
    title: "Your mentor application was not approved",
    body: reviewNote ?? "You're welcome to apply again once you've contributed more.",
  });

  return application;
}
