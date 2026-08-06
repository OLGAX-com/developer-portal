import type { Role } from "@prisma/client";
import { prisma } from "../client";

export function listAllUsers() {
  return prisma.user.findMany({
    include: { profile: true },
    orderBy: { createdAt: "asc" },
  });
}

export function updateUserRole(userId: string, role: Role) {
  return prisma.user.update({ where: { id: userId }, data: { role } });
}
