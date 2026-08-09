"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth, hasRole } from "@olgax/auth";
import { approveProgramCompletion as approveService, prisma } from "@olgax/database";

async function assertIsAdministrator() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!hasRole(user.role, "ADMINISTRATOR")) throw new Error("Only administrators can do this.");
}

export async function approveProgramCompletion(enrollmentId: string) {
  await assertIsAdministrator();
  await approveService(enrollmentId);
  revalidatePath("/admin/program-approvals");
}
