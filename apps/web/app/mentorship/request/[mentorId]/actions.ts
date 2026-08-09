"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@olgax/auth";
import { prisma, requestMentorship as requestMentorshipService } from "@olgax/database";

export async function submitMentorshipRequest(mentorId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in to request mentorship.");
  if (session.user.id === mentorId) throw new Error("You can't request mentorship from yourself.");

  const age = String(formData.get("age") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim() || undefined;
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim() || undefined;

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      age: age ? Number(age) : undefined,
      university,
      linkedinUrl,
    },
    update: {
      age: age ? Number(age) : undefined,
      university,
      linkedinUrl,
    },
  });

  const goals = String(formData.get("goals") ?? "").trim() || undefined;
  const skillLevel = String(formData.get("skillLevel") ?? "").trim() || undefined;
  const availability = String(formData.get("availability") ?? "").trim() || undefined;
  const message = String(formData.get("message") ?? "").trim() || undefined;

  await requestMentorshipService({
    mentorId,
    studentId: session.user.id,
    message,
    goals,
    skillLevel,
    availability,
  });

  redirect("/mentorship/dashboard?requested=1");
}
