"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth, hasRole } from "@olgax/auth";
import {
  prisma,
  approveProposal as approveProposalService,
  rejectProposal as rejectProposalService,
  linkProposalToProject as linkProposalToProjectService,
} from "@olgax/database";

async function requireMaintainer() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!hasRole(user.role, "MAINTAINER")) throw new Error("Only maintainers and administrators can review proposals.");

  return session.user.id;
}

export async function approveProposal(proposalId: string) {
  const reviewerId = await requireMaintainer();
  await approveProposalService(proposalId, reviewerId);
  revalidatePath("/projects/proposals/review");
  revalidatePath("/projects/proposals");
}

export async function rejectProposal(proposalId: string, formData: FormData) {
  const reviewerId = await requireMaintainer();
  const reason = ((formData.get("reason") as string) ?? "").trim();
  if (!reason) throw new Error("A rejection reason is required so the proposer knows why.");

  await rejectProposalService(proposalId, reviewerId, reason);
  revalidatePath("/projects/proposals/review");
}

export async function linkProposalToProject(proposalId: string, formData: FormData) {
  await requireMaintainer();
  const projectId = (formData.get("projectId") as string) ?? "";
  if (!projectId) throw new Error("Select a project to link.");

  await linkProposalToProjectService(proposalId, projectId);
  revalidatePath("/projects/proposals/review");
  revalidatePath("/projects/proposals");
}
