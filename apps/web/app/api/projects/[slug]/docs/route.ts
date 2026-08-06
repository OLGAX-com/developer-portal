import { NextResponse } from "next/server";

import { prisma } from "@olgax/database";
import { listDocsPages } from "@olgax/github";

/** Public, read-only list of a tracked project's real doc pages. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { slug: true, name: true, githubOwner: true, githubRepo: true, defaultBranch: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const pages = await listDocsPages(project.githubOwner, project.githubRepo);
  return NextResponse.json({ project, pages });
}
