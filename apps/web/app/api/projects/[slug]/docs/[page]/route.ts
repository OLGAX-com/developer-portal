import { NextResponse } from "next/server";

import { prisma } from "@olgax/database";
import { getDocPage, listDocsPages } from "@olgax/github";

/** Public, read-only single doc page (raw content + metadata), fetched live from GitHub. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; page: string }> },
) {
  const { slug, page } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { slug: true, name: true, githubOwner: true, githubRepo: true, defaultBranch: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const pages = await listDocsPages(project.githubOwner, project.githubRepo);
  const currentPage = pages.find((p) => p.slug === page);
  if (!currentPage) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const content = await getDocPage(project.githubOwner, project.githubRepo, currentPage.path);
  if (content === null) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  return NextResponse.json({ project, pages, page: currentPage, content });
}
