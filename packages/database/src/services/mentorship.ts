import { prisma } from "../client";
import { issueCertificate } from "./certificates";
import { createNotification } from "./notifications";

export async function requestMentorship(input: {
  mentorId: string;
  studentId: string;
  message?: string;
  goals?: string;
  skillLevel?: string;
  availability?: string;
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
      data: {
        status: "PENDING",
        message: input.message,
        goals: input.goals,
        skillLevel: input.skillLevel,
        availability: input.availability,
        feedback: null,
      },
    });
  }
  if (existing) return existing;

  return prisma.mentorship.create({
    data: {
      mentorId: input.mentorId,
      studentId: input.studentId,
      cohortId: input.cohortId,
      message: input.message,
      goals: input.goals,
      skillLevel: input.skillLevel,
      availability: input.availability,
    },
  });
}

export function respondToMentorship(mentorshipId: string, status: "ACTIVE" | "DECLINED") {
  return prisma.mentorship.update({ where: { id: mentorshipId }, data: { status } });
}

/** Only the mentor on a mentorship can schedule a session with their student. */
export async function scheduleMentorshipSession(
  mentorshipId: string,
  mentorId: string,
  scheduledAt: Date,
  notes?: string,
  meetingLink?: string,
) {
  const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
  if (!mentorship || mentorship.mentorId !== mentorId) {
    throw new Error("Only the assigned mentor can schedule a session.");
  }

  return prisma.mentorshipSession.create({ data: { mentorshipId, scheduledAt, notes, meetingLink } });
}

/** Schedules the same session for every ACTIVE mentorship the mentor selects - skips any id that isn't theirs or isn't active. */
export async function scheduleGroupMentorshipSessions(
  mentorId: string,
  mentorshipIds: string[],
  scheduledAt: Date,
  notes?: string,
  meetingLink?: string,
) {
  const validMentorships = await prisma.mentorship.findMany({
    where: { id: { in: mentorshipIds }, mentorId, status: "ACTIVE" },
    select: { id: true },
  });

  if (validMentorships.length === 0) return 0;

  await prisma.mentorshipSession.createMany({
    data: validMentorships.map(({ id }) => ({ mentorshipId: id, scheduledAt, notes, meetingLink })),
  });

  return validMentorships.length;
}

export function listMentorshipSessions(mentorshipId: string) {
  return prisma.mentorshipSession.findMany({ where: { mentorshipId }, orderBy: { scheduledAt: "asc" } });
}

/** Only the mentor or student on a mentorship can message each other, once it's active. */
export async function sendMentorshipMessage(mentorshipId: string, senderId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message can't be empty.");

  const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
  if (!mentorship || (mentorship.mentorId !== senderId && mentorship.studentId !== senderId)) {
    throw new Error("You're not part of this mentorship.");
  }
  if (mentorship.status !== "ACTIVE" && mentorship.status !== "GRADUATED") {
    throw new Error("You can only message once the mentorship is active.");
  }

  const message = await prisma.mentorshipMessage.create({ data: { mentorshipId, senderId, body: trimmed } });

  const recipientId = mentorship.mentorId === senderId ? mentorship.studentId : mentorship.mentorId;
  await createNotification({
    userId: recipientId,
    type: "MENTORSHIP_UPDATE",
    title: "New mentorship message",
    body: trimmed.length > 140 ? `${trimmed.slice(0, 140)}\u2026` : trimmed,
    link: "/mentorship/dashboard",
  });

  return message;
}

export function listMentorshipMessages(mentorshipId: string) {
  return prisma.mentorshipMessage.findMany({ where: { mentorshipId }, orderBy: { createdAt: "asc" } });
}

/** Sends the same message to every ACTIVE/GRADUATED mentorship the mentor selects - skips any id that isn't theirs or isn't messageable. */
export async function broadcastMentorshipMessage(mentorId: string, mentorshipIds: string[], body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message can't be empty.");

  const validMentorships = await prisma.mentorship.findMany({
    where: { id: { in: mentorshipIds }, mentorId, status: { in: ["ACTIVE", "GRADUATED"] } },
    select: { id: true },
  });

  for (const { id } of validMentorships) {
    await sendMentorshipMessage(id, mentorId, trimmed);
  }

  return validMentorships.length;
}

/**
 * Every conversation (as mentor or student) that can currently be messaged, newest activity
 * first - powers the site-wide chat widget so a thread never has to be hunted down on
 * /mentorship. "Needs your reply" is a real, computable signal: the other party sent the last
 * message (there's no read-receipt tracking, so this is the closest honest proxy for unread).
 */
export async function listMessageableConversations(userId: string) {
  const mentorships = await prisma.mentorship.findMany({
    where: { OR: [{ mentorId: userId }, { studentId: userId }], status: { in: ["ACTIVE", "GRADUATED"] } },
    include: {
      mentor: true,
      student: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return mentorships
    .map((mentorship) => {
      const otherParty = mentorship.mentorId === userId ? mentorship.student : mentorship.mentor;
      const lastMessage = mentorship.messages[mentorship.messages.length - 1] ?? null;
      return {
        id: mentorship.id,
        status: mentorship.status,
        otherParty,
        messages: mentorship.messages,
        needsReply: lastMessage !== null && lastMessage.senderId !== userId,
        lastActivityAt: lastMessage?.createdAt ?? mentorship.createdAt,
      };
    })
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
}

export async function graduateMentorship(mentorshipId: string, feedback?: string) {
  const mentorship = await prisma.mentorship.update({
    where: { id: mentorshipId },
    data: { status: "GRADUATED", feedback },
    include: { mentor: true, student: true },
  });

  const studentCertificate = await issueCertificate({
    userId: mentorship.studentId,
    title: "Mentorship Graduate",
    mentorName: mentorship.mentor.name,
    achievements: feedback ? [feedback] : [],
  });

  await createNotification({
    userId: mentorship.studentId,
    type: "SYSTEM",
    title: "You graduated!",
    body: `${mentorship.mentor.name} marked your mentorship as complete. Your certificate is ready to view and share.`,
    link: `/certificates/${studentCertificate.id}`,
  });

  // First time this mentor has successfully graduated anyone - award their own certificate too.
  const priorMentorCertificate = await prisma.certificate.findFirst({
    where: { userId: mentorship.mentorId, title: "Certified Olgax Mentor" },
  });
  if (!priorMentorCertificate) {
    const graduatedCount = await prisma.mentorship.count({
      where: { mentorId: mentorship.mentorId, status: "GRADUATED" },
    });
    const mentorCertificate = await issueCertificate({
      userId: mentorship.mentorId,
      title: "Certified Olgax Mentor",
      achievements: [`Mentored ${graduatedCount} contributor${graduatedCount === 1 ? "" : "s"} to graduation`],
    });

    await createNotification({
      userId: mentorship.mentorId,
      type: "SYSTEM",
      title: "You're a Certified Olgax Mentor!",
      body: `You've graduated ${graduatedCount} contributor${graduatedCount === 1 ? "" : "s"}. Your certificate is ready to view and share.`,
      link: `/certificates/${mentorCertificate.id}`,
    });
  }

  return mentorship;
}

/** Only the student on a GRADUATED mentorship can rate their mentor, and only once. */
export async function rateMentor(mentorshipId: string, studentId: string, rating: number, review?: string) {
  if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5.");

  const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
  if (!mentorship || mentorship.studentId !== studentId) {
    throw new Error("You can only rate a mentor from your own mentorship.");
  }
  if (mentorship.status !== "GRADUATED") {
    throw new Error("You can only rate a mentor after graduating.");
  }

  return prisma.mentorship.update({
    where: { id: mentorshipId },
    data: { mentorRating: rating, mentorReview: review },
  });
}

export interface MentorRatingSummary {
  averageRating: number | null;
  ratingCount: number;
}

export async function getMentorRatingSummary(mentorId: string): Promise<MentorRatingSummary> {
  const result = await prisma.mentorship.aggregate({
    where: { mentorId, mentorRating: { not: null } },
    _avg: { mentorRating: true },
    _count: { mentorRating: true },
  });

  return { averageRating: result._avg.mentorRating, ratingCount: result._count.mentorRating };
}

export function saveMentor(userId: string, mentorId: string) {
  return prisma.savedMentor.upsert({
    where: { userId_mentorId: { userId, mentorId } },
    create: { userId, mentorId },
    update: {},
  });
}

export function unsaveMentor(userId: string, mentorId: string) {
  return prisma.savedMentor.deleteMany({ where: { userId, mentorId } });
}

export function listSavedMentorIds(userId: string) {
  return prisma.savedMentor.findMany({ where: { userId }, select: { mentorId: true } });
}

export async function listMentors() {
  const mentors = await prisma.user.findMany({
    where: { role: { in: ["MENTOR", "MAINTAINER", "ADMINISTRATOR"] } },
    include: { profile: true },
    orderBy: { name: "asc" },
  });

  const ratings = await prisma.mentorship.groupBy({
    by: ["mentorId"],
    where: { mentorRating: { not: null } },
    _avg: { mentorRating: true },
    _count: { mentorRating: true },
  });
  const ratingByMentor = new Map<string, MentorRatingSummary>(
    ratings.map((row) => [row.mentorId, { averageRating: row._avg.mentorRating, ratingCount: row._count.mentorRating }]),
  );

  return mentors.map((mentor) => ({
    ...mentor,
    ratingSummary: ratingByMentor.get(mentor.id) ?? { averageRating: null, ratingCount: 0 },
  }));
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

/** A single mentor's public profile - name, role/company, education, experience, expertise, links, rating. Returns null for non-mentors. */
export async function getMentorProfile(mentorId: string) {
  const mentor = await prisma.user.findUnique({
    where: { id: mentorId },
    include: { profile: true },
  });
  if (!mentor || !["MENTOR", "MAINTAINER", "ADMINISTRATOR"].includes(mentor.role)) return null;

  const ratingSummary = await getMentorRatingSummary(mentorId);
  return { ...mentor, ratingSummary };
}
