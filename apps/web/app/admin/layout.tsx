import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, hasRole } from "@olgax/auth";
import { prisma } from "@olgax/database";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!hasRole(user.role, "ADMINISTRATOR")) redirect("/");

  return children;
}
