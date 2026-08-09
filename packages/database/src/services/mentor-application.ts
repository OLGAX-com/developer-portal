import { prisma } from "../client";
import { createNotification } from "./notifications";

export interface MentorProfileDetails {
  currentRole?: string;
  company?: string;
  yearsOfExperience?: number;
  expertiseAreas: string[];
  whyMentor: string;
  mentorOffering: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  otherLinks?: string[];
}

/** The single place mentor-profile fields are written - reused by both the initial application and later edits. */
export function saveMentorProfileDetails(userId: string, details: MentorProfileDetails) {
  const data = {
    currentRole: details.currentRole,
    company: details.company,
    yearsOfExperience: details.yearsOfExperience,
    expertiseAreas: details.expertiseAreas,
    whyMentor: details.whyMentor,
    mentorOffering: details.mentorOffering,
    linkedinUrl: details.linkedinUrl,
    portfolioUrl: details.portfolioUrl,
    otherLinks: details.otherLinks ?? [],
  };

  return prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function applyForMentorship(userId: string, details: MentorProfileDetails) {
  await saveMentorProfileDetails(userId, details);

  const existingPending = await prisma.mentorApplication.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (existingPending) return existingPending;

  return prisma.mentorApplication.create({ data: { userId, message: details.whyMentor } });
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
