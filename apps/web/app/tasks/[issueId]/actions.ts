"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth, hasRole } from "@olgax/auth";
import {
  addTaskComment as addTaskCommentService,
  claimIssue as claimIssueService,
  forceReleaseIssueClaim,
  getTaskDetail,
  prisma,
  releaseIssueClaim as releaseIssueClaimService,
} from "@olgax/database";

export async function claimIssue(issueId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in to claim a task.");

  await claimIssueService(session.user.id, issueId);
  revalidatePath(`/tasks/${issueId}`);
  revalidatePath("/tasks");
}

export async function releaseIssueClaim(issueId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  await releaseIssueClaimService(session.user.id, issueId);
  revalidatePath(`/tasks/${issueId}`);
  revalidatePath("/tasks");
}

/** Lets a maintainer/admin free up a claim someone went quiet on. */
export async function releaseStaleIssueClaim(issueId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const [user, task] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    getTaskDetail(issueId),
  ]);

  const isProjectMaintainer = await prisma.projectMaintainer.findFirst({
    where: { userId: session.user.id, projectId: task?.projectId },
  });
  if (!hasRole(user.role, "MAINTAINER") && !isProjectMaintainer) {
    throw new Error("Only a maintainer or administrator can release someone else's claim.");
  }

  await forceReleaseIssueClaim(issueId);
  revalidatePath(`/tasks/${issueId}`);
  revalidatePath("/tasks");
}

export async function addComment(issueId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in to comment.");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await addTaskCommentService(session.user.id, issueId, body);
  revalidatePath(`/tasks/${issueId}`);
}
