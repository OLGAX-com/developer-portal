"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth, hasRole } from "@olgax/auth";
import { approveMentorApplication as approveService, prisma, rejectMentorApplication as rejectService } from "@olgax/database";

async function assertIsAdministrator() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!hasRole(user.role, "ADMINISTRATOR")) throw new Error("Only administrators can do this.");
}

export async function approveMentorApplication(applicationId: string) {
  await assertIsAdministrator();
  await approveService(applicationId);
  revalidatePath("/admin/mentor-applications");
}

export async function rejectMentorApplication(applicationId: string) {
  await assertIsAdministrator();
  await rejectService(applicationId);
  revalidatePath("/admin/mentor-applications");
}
