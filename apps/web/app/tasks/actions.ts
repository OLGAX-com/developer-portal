"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@olgax/auth";
import { claimIssue as claimIssueService, releaseIssueClaim as releaseIssueClaimService } from "@olgax/database";

export async function claimIssue(issueId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in to claim a task.");

  await claimIssueService(session.user.id, issueId);
  revalidatePath("/tasks");
  revalidatePath("/projects", "layout");
}

export async function releaseIssueClaim(issueId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  await releaseIssueClaimService(session.user.id, issueId);
  revalidatePath("/tasks");
  revalidatePath("/projects", "layout");
}
