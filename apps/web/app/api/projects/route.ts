import { NextResponse } from "next/server";

import { prisma } from "@olgax/database";

/** Public, read-only list of tracked projects - same data already shown on /projects. */
export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      githubOwner: true,
      githubRepo: true,
      primaryLanguage: true,
      stargazersCount: true,
    },
  });

  return NextResponse.json({ projects });
}
