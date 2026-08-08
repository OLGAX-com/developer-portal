"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@olgax/auth";
import {
  enrollInProgram as enrollInProgramService,
  unenrollFromProgram as unenrollFromProgramService,
} from "@olgax/database";

export async function enrollInProgram(programSlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in to enroll.");

  await enrollInProgramService(session.user.id, programSlug);
  revalidatePath("/programs");
}

export async function unenrollFromProgram(programId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  await unenrollFromProgramService(session.user.id, programId);
  revalidatePath("/programs");
}
