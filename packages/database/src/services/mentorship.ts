import { prisma } from "../client";
import { issueCertificate } from "./certificates";

export async function requestMentorship(input: {
  mentorId: string;
  studentId: string;
  message?: string;
  cohortId?: string;
}) {
  // Not a plain upsert on the compound unique: Postgres treats NULL cohortId as
  // distinct per row, so a DB-level upsert wouldn't dedupe "no cohort" requests.
  const existing = await prisma.mentorship.findFirst({
    where: { mentorId: input.mentorId, studentId: input.studentId, cohortId: input.cohortId ?? null },
  });

  // A declined/cancelled request must be reopenable, or the student is stuck forever.
  if (existing && (existing.status === "DECLINED" || existing.status === "CANCELLED")) {
    return prisma.mentorship.update({
      where: { id: existing.id },
      data: { status: "PENDING", message: input.message, feedback: null },
    });
  }
  if (existing) return existing;

  return prisma.mentorship.create({
    data: {
      mentorId: input.mentorId,
      studentId: input.studentId,
      cohortId: input.cohortId,
      message: input.message,
    },
  });
}

export function respondToMentorship(mentorshipId: string, status: "ACTIVE" | "DECLINED") {
  return prisma.mentorship.update({ where: { id: mentorshipId }, data: { status } });
}

export async function graduateMentorship(mentorshipId: string, feedback?: string) {
  const mentorship = await prisma.mentorship.update({
    where: { id: mentorshipId },
    data: { status: "GRADUATED", feedback },
    include: { mentor: true, student: true },
  });

  await issueCertificate({
    userId: mentorship.studentId,
    title: "Mentorship Graduate",
    mentorName: mentorship.mentor.name,
    achievements: feedback ? [feedback] : [],
  });

  return mentorship;
}

export function listMentors() {
  return prisma.user.findMany({
    where: { role: { in: ["MENTOR", "MAINTAINER", "ADMINISTRATOR"] } },
    include: { profile: true },
    orderBy: { name: "asc" },
  });
}

export function listMentorshipsForUser(userId: string) {
  return prisma.mentorship.findMany({
    where: { OR: [{ mentorId: userId }, { studentId: userId }] },
    include: {
      mentor: { include: { profile: true } },
      student: { include: { profile: true } },
      cohort: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
