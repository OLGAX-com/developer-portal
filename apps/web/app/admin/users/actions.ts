"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth, hasRole } from "@olgax/auth";
import { prisma, updateUserRole as updateUserRoleService, type Role } from "@olgax/database";

async function assertIsAdministrator() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!hasRole(user.role, "ADMINISTRATOR")) throw new Error("Only administrators can do this.");
  return user;
}

export async function updateUserRole(userId: string, role: Role) {
  const admin = await assertIsAdministrator();

  if (userId === admin.id && role !== "ADMINISTRATOR") {
    throw new Error("You can't remove your own administrator role.");
  }

  await updateUserRoleService(userId, role);
  revalidatePath("/admin/users");
}
