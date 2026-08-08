"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@olgax/auth";
import {
  applyForMentorship as applyForMentorshipService,
  broadcastMentorshipMessage as broadcastMentorshipMessageService,
  graduateMentorship as graduateMentorshipService,
  prisma,
  rateMentor as rateMentorService,
  requestMentorship as requestMentorshipService,
  respondToMentorship as respondToMentorshipService,
  saveMentor as saveMentorService,
  scheduleGroupMentorshipSessions as scheduleGroupMentorshipSessionsService,
  scheduleMentorshipSession as scheduleMentorshipSessionService,
  sendMentorshipMessage as sendMentorshipMessageService,
  unsaveMentor as unsaveMentorService,
} from "@olgax/database";

export async function requestMentorship(mentorId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in to request mentorship.");
  if (session.user.id === mentorId) throw new Error("You can't request mentorship from yourself.");

  const message = String(formData.get("message") ?? "").trim() || undefined;

  await requestMentorshipService({ mentorId, studentId: session.user.id, message });
  revalidatePath("/mentorship");
}

export async function applyForMentorship(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in to apply.");

  const message = String(formData.get("message") ?? "").trim();
  if (!message) throw new Error("Tell us a bit about why you'd like to mentor.");

  await applyForMentorshipService(session.user.id, message);
  revalidatePath("/mentorship");
}

async function assertIsMentorOnMentorship(mentorshipId: string, mentorId: string) {
  const mentorship = await prisma.mentorship.findUniqueOrThrow({ where: { id: mentorshipId } });
  if (mentorship.mentorId !== mentorId) throw new Error("Only the assigned mentor can do this.");
}

export async function acceptMentorship(mentorshipId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");
  await assertIsMentorOnMentorship(mentorshipId, session.user.id);

  await respondToMentorshipService(mentorshipId, "ACTIVE");
  revalidatePath("/mentorship");
}

export async function declineMentorship(mentorshipId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");
  await assertIsMentorOnMentorship(mentorshipId, session.user.id);

  await respondToMentorshipService(mentorshipId, "DECLINED");
  revalidatePath("/mentorship");
}

export async function graduateMentorship(mentorshipId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");
  await assertIsMentorOnMentorship(mentorshipId, session.user.id);

  await graduateMentorshipService(mentorshipId);
  revalidatePath("/mentorship");
}

export async function scheduleSession(mentorshipId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const scheduledAt = new Date(String(formData.get("scheduledAt") ?? ""));
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Pick a valid date and time.");
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const meetingLink = String(formData.get("meetingLink") ?? "").trim() || undefined;

  await scheduleMentorshipSessionService(mentorshipId, session.user.id, scheduledAt, notes, meetingLink);
  revalidatePath("/mentorship");
}

export async function scheduleGroupSession(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const mentorshipIds = formData.getAll("mentorshipIds").map(String);
  if (mentorshipIds.length === 0) throw new Error("Select at least one student.");

  const scheduledAt = new Date(String(formData.get("scheduledAt") ?? ""));
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Pick a valid date and time.");
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const meetingLink = String(formData.get("meetingLink") ?? "").trim() || undefined;

  await scheduleGroupMentorshipSessionsService(session.user.id, mentorshipIds, scheduledAt, notes, meetingLink);
  revalidatePath("/mentorship");
}

export async function broadcastMessage(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const mentorshipIds = formData.getAll("mentorshipIds").map(String);
  if (mentorshipIds.length === 0) throw new Error("Select at least one student.");

  const body = String(formData.get("body") ?? "");
  await broadcastMentorshipMessageService(session.user.id, mentorshipIds, body);
  revalidatePath("/mentorship");
}

export async function sendMessage(mentorshipId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const body = String(formData.get("body") ?? "");
  await sendMentorshipMessageService(mentorshipId, session.user.id, body);
  revalidatePath("/mentorship");
}

export async function rateMentor(mentorshipId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const rating = Number(formData.get("rating"));
  const review = String(formData.get("review") ?? "").trim() || undefined;

  await rateMentorService(mentorshipId, session.user.id, rating, review);
  revalidatePath("/mentorship");
}

export async function saveMentor(mentorId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  await saveMentorService(session.user.id, mentorId);
  revalidatePath("/mentorship");
}

export async function unsaveMentor(mentorId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  await unsaveMentorService(session.user.id, mentorId);
  revalidatePath("/mentorship");
}
