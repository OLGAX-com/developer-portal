import { prisma } from "../client";

export function addTaskComment(userId: string, issueId: string, body: string) {
  return prisma.taskComment.create({ data: { userId, issueId, body } });
}

export function listTaskComments(issueId: string) {
  return prisma.taskComment.findMany({
    where: { issueId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}
