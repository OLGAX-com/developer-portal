"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@olgax/auth";
import { markOnboardingStepComplete as markStepService, prisma } from "@olgax/database";
import { hasUserPostedInOrgDiscussions } from "@olgax/github";

export async function markOnboardingStepComplete(key: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  await markStepService(session.user.id, key);
  revalidatePath("/dashboard");
}

/** Verifies "said hello in Discussions" against real GitHub activity instead of a self-report. */
export async function verifySaidHelloInDiscussions() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
  if (!profile?.githubUsername) {
    redirect("/dashboard?discussionCheck=nogithub");
  }

  // Check every distinct GitHub org we track a project under (not just individual repos) -
  // matches the real "organization discussions" view, which aggregates across every repo.
  const projects = await prisma.project.findMany({ select: { githubOwner: true } });
  const orgs = [...new Set(projects.map((project) => project.githubOwner))];

  let verified = false;
  for (const org of orgs) {
    if (await hasUserPostedInOrgDiscussions(org, profile.githubUsername)) {
      verified = true;
      break;
    }
  }

  if (verified) {
    await markStepService(session.user.id, "said_hello_discussions");
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?discussionCheck=${verified ? "verified" : "notfound"}`);
}
