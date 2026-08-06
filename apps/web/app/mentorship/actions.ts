"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@olgax/auth";
import {
  applyForMentorship as applyForMentorshipService,
  graduateMentorship as graduateMentorshipService,
  prisma,
  requestMentorship as requestMentorshipService,
  respondToMentorship as respondToMentorshipService,
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
