"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, hasRole } from "@olgax/auth";
import {
  applyForMentorship as applyForMentorshipService,
  MENTOR_EXPERTISE_AREAS,
  prisma,
  saveMentorProfileDetails,
} from "@olgax/database";

function parseOtherLinks(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((link) => link.trim())
    .filter(Boolean);
}

export async function submitMentorApplication(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const currentRole = String(formData.get("currentRole") ?? "").trim() || undefined;
  const company = String(formData.get("company") ?? "").trim() || undefined;
  const university = String(formData.get("university") ?? "").trim() || undefined;
  const yearsOfExperienceRaw = String(formData.get("yearsOfExperience") ?? "").trim();
  const yearsOfExperience = yearsOfExperienceRaw ? Number(yearsOfExperienceRaw) : undefined;

  const expertiseAreas = formData.getAll("expertiseAreas").map(String).filter((area) => (MENTOR_EXPERTISE_AREAS as readonly string[]).includes(area));
  if (expertiseAreas.length === 0) throw new Error("Pick at least one area of expertise.");

  const whyMentor = String(formData.get("whyMentor") ?? "").trim();
  const mentorOffering = String(formData.get("mentorOffering") ?? "").trim();
  if (!whyMentor) throw new Error("Tell us why you'd like to mentor.");
  if (!mentorOffering) throw new Error("Tell us what you can offer mentees.");

  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim() || undefined;
  const portfolioUrl = String(formData.get("portfolioUrl") ?? "").trim() || undefined;
  const otherLinks = parseOtherLinks(String(formData.get("otherLinks") ?? ""));

  if (university) {
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, university },
      update: { university },
    });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const details = { currentRole, company, yearsOfExperience, expertiseAreas, whyMentor, mentorOffering, linkedinUrl, portfolioUrl, otherLinks };

  if (hasRole(user.role, "MENTOR")) {
    await saveMentorProfileDetails(session.user.id, details);
    redirect("/mentorship/apply?updated=1");
  }

  await applyForMentorshipService(session.user.id, details);
  redirect("/mentorship/apply?submitted=1");
}
