"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@olgax/auth";
import { updateProfile as updateProfileService } from "@olgax/database";

export async function updateProfile(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("You must be signed in.");

  const age = formData.get("age");

  await updateProfileService(session.user.id, {
    bio: (formData.get("bio") as string) || null,
    university: (formData.get("university") as string) || null,
    location: (formData.get("location") as string) || null,
    linkedinUrl: (formData.get("linkedinUrl") as string) || null,
    age: age ? Number(age) : null,
  });

  revalidatePath("/profile");
}
