import { prisma } from "../client";
import { createNotification } from "./notifications";

export function proposeProject(proposerId: string, title: string, description: string) {
  return prisma.projectProposal.create({ data: { proposerId, title: title.trim(), description: description.trim() } });
}

/** Only the original proposer can edit a REJECTED proposal, and doing so sends it back to PENDING review. */
export async function resubmitProposal(proposalId: string, proposerId: string, title: string, description: string) {
  const proposal = await prisma.projectProposal.findUniqueOrThrow({ where: { id: proposalId } });
  if (proposal.proposerId !== proposerId) throw new Error("You can only edit your own proposal.");
  if (proposal.status !== "REJECTED") throw new Error("Only a rejected proposal can be edited and resubmitted.");

  return prisma.projectProposal.update({
    where: { id: proposalId },
    data: {
      title: title.trim(),
      description: description.trim(),
      status: "PENDING",
      rejectionReason: null,
      reviewerId: null,
      reviewedAt: null,
    },
  });
}

export function listProposalsForUser(userId: string) {
  return prisma.projectProposal.findMany({ where: { proposerId: userId }, orderBy: { createdAt: "desc" } });
}

/** The review queue for maintainers/administrators - proposals stay invisible to everyone else until reviewed. */
export function listPendingProposals() {
  return prisma.projectProposal.findMany({
    where: { status: "PENDING" },
    include: { proposer: true },
    orderBy: { createdAt: "asc" },
  });
}

export function listApprovedProposals() {
  return prisma.projectProposal.findMany({
    where: { status: "APPROVED" },
    include: { proposer: true, linkedProject: true, _count: { select: { comments: true, interests: true } } },
    orderBy: { reviewedAt: "desc" },
  });
}

/** Full detail for one proposal - callers must separately check visibility (PENDING/REJECTED are private). */
export function getProposal(id: string) {
  return prisma.projectProposal.findUnique({
    where: { id },
    include: {
      proposer: true,
      linkedProject: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      interests: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function approveProposal(proposalId: string, reviewerId: string) {
  const proposal = await prisma.projectProposal.update({
    where: { id: proposalId },
    data: { status: "APPROVED", reviewerId, reviewedAt: new Date(), rejectionReason: null },
  });

  await createNotification({
    userId: proposal.proposerId,
    type: "SYSTEM",
    title: `Your project proposal "${proposal.title}" was approved!`,
    body: "It's now public - contributors can comment and join. We'll follow up once the repository is created.",
    link: `/projects/proposals/${proposal.id}`,
  });

  return proposal;
}

export async function rejectProposal(proposalId: string, reviewerId: string, reason: string) {
  const proposal = await prisma.projectProposal.update({
    where: { id: proposalId },
    data: { status: "REJECTED", reviewerId, reviewedAt: new Date(), rejectionReason: reason },
  });

  await createNotification({
    userId: proposal.proposerId,
    type: "SYSTEM",
    title: `Your project proposal "${proposal.title}" wasn't approved`,
    body: reason,
    link: "/projects/proposals",
  });

  return proposal;
}

/** Links an approved proposal to the real tracked Project once a maintainer has created the GitHub repo. */
export function linkProposalToProject(proposalId: string, projectId: string) {
  return prisma.projectProposal.update({ where: { id: proposalId }, data: { linkedProjectId: projectId } });
}

export async function addProposalComment(proposalId: string, authorId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment can't be empty.");

  const proposal = await prisma.projectProposal.findUniqueOrThrow({ where: { id: proposalId } });
  if (proposal.status !== "APPROVED") throw new Error("Comments open once a proposal is approved.");

  const comment = await prisma.projectProposalComment.create({ data: { proposalId, authorId, body: trimmed } });

  if (proposal.proposerId !== authorId) {
    await createNotification({
      userId: proposal.proposerId,
      type: "SYSTEM",
      title: `New comment on "${proposal.title}"`,
      body: trimmed.length > 140 ? `${trimmed.slice(0, 140)}\u2026` : trimmed,
      link: `/projects/proposals/${proposalId}`,
    });
  }

  return comment;
}

/** Expresses interest in teaming up on an approved proposal ("Join project"); idempotent. */
export async function joinProposalInterest(proposalId: string, userId: string) {
  const proposal = await prisma.projectProposal.findUniqueOrThrow({ where: { id: proposalId } });
  if (proposal.status !== "APPROVED") throw new Error("You can only join an approved proposal.");

  const existing = await prisma.projectProposalInterest.findUnique({
    where: { proposalId_userId: { proposalId, userId } },
  });
  if (existing) return existing;

  const interest = await prisma.projectProposalInterest.create({ data: { proposalId, userId } });

  if (proposal.proposerId !== userId) {
    await createNotification({
      userId: proposal.proposerId,
      type: "SYSTEM",
      title: `Someone wants to join "${proposal.title}"`,
      body: "Check the proposal page to see who's interested.",
      link: `/projects/proposals/${proposalId}`,
    });
  }

  return interest;
}

export function leaveProposalInterest(proposalId: string, userId: string) {
  return prisma.projectProposalInterest.deleteMany({ where: { proposalId, userId } });
}
