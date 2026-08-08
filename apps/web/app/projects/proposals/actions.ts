"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@olgax/auth";
import {
  proposeProject as proposeProjectService,
  resubmitProposal as resubmitProposalService,
  addProposalComment as addProposalCommentService,
  joinProposalInterest as joinProposalInterestService,
  leaveProposalInterest as leaveProposalInterestService,
} from "@olgax/database";

export async function proposeProject(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const title = (formData.get("title") as string) ?? "";
  const description = (formData.get("description") as string) ?? "";
  if (!title.trim() || !description.trim()) throw new Error("Title and description are required.");

  const repoUrl = (formData.get("repoUrl") as string) ?? "";
  const technologies = ((formData.get("technologies") as string) ?? "")
    .split(",")
    .map((tech) => tech.trim())
    .filter(Boolean);
  const desiredImpact = (formData.get("desiredImpact") as string) ?? "";

  await proposeProjectService(session.user.id, title, description, { repoUrl, technologies, desiredImpact });
  revalidatePath("/projects/proposals");
}

export async function resubmitProposal(proposalId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const title = (formData.get("title") as string) ?? "";
  const description = (formData.get("description") as string) ?? "";
  if (!title.trim() || !description.trim()) throw new Error("Title and description are required.");

  const repoUrl = (formData.get("repoUrl") as string) ?? "";
  const technologies = ((formData.get("technologies") as string) ?? "")
    .split(",")
    .map((tech) => tech.trim())
    .filter(Boolean);
  const desiredImpact = (formData.get("desiredImpact") as string) ?? "";

  await resubmitProposalService(proposalId, session.user.id, title, description, { repoUrl, technologies, desiredImpact });
  revalidatePath("/projects/proposals");
}

export async function addComment(proposalId: string, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const body = (formData.get("body") as string) ?? "";
  await addProposalCommentService(proposalId, session.user.id, body);
  revalidatePath(`/projects/proposals/${proposalId}`);
}

export async function joinInterest(proposalId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  await joinProposalInterestService(proposalId, session.user.id);
  revalidatePath(`/projects/proposals/${proposalId}`);
}

export async function leaveInterest(proposalId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  await leaveProposalInterestService(proposalId, session.user.id);
  revalidatePath(`/projects/proposals/${proposalId}`);
}
