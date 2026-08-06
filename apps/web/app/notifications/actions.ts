"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@olgax/auth";
import { markAllNotificationsRead } from "@olgax/database";

export async function markAllNotificationsReadAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;

  await markAllNotificationsRead(session.user.id);
  revalidatePath("/", "layout");
}
