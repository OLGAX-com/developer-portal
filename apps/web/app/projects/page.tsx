import Link from "next/link";
import { Star } from "lucide-react";

import { prisma } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function isGoodFirstIssueLabel(label: string) {
  const normalized = label.toLowerCase();
  return normalized.includes("good first issue") || normalized.includes("good-first-issue");
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ tech?: string; gfi?: string }>;
}) {
  const { tech, gfi } = await searchParams;

  const projects = await prisma.project.findMany({
    orderBy: { stargazersCount: "desc" },
    include: { issues: { where: { isPullRequest: false, state: "open" }, select: { labels: true } } },
  });

  const withCounts = projects.map((project) => ({
    ...project,
    goodFirstIssueCount: project.issues.filter((issue) => issue.labels.some(isGoodFirstIssueLabel)).length,
  }));

  const technologies = [...new Set(projects.map((p) => p.primaryLanguage).filter((lang): lang is string => Boolean(lang)))].sort();

  const labelCounts = new Map<string, number>();
  for (const project of projects) {
    for (const issue of project.issues) {
      for (const label of issue.labels) {
        labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
      }
    }
  }
  const trendingTags = [...labelCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const filtered = withCounts.filter((project) => {
    if (tech && project.primaryLanguage !== tech) return false;
    if (gfi === "1" && project.goodFirstIssueCount === 0) return false;
    return true;
  });

  const featured = !tech && !gfi ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;

  const activeFilters = Boolean(tech) || gfi === "1";

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <Link href="/projects/proposals" className="text-sm text-navy hover:underline dark:text-yellow">
          Propose a project →
        </Link>
      </div>
      <p className="mb-8 text-muted-foreground">
        Every open-source project in the Olgax ecosystem, synced live from GitHub.
      </p>

      {projects.length === 0 ? (
        <p className="text-muted-foreground">
          No projects tracked yet. Run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            pnpm --filter @olgax/github run add-project
          </code>{" "}
          to add one.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="flex flex-col gap-6">
            <div>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Technologies</h2>
              <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-start">
                {technologies.map((technology) => (
                  <Link key={technology} href={tech === technology ? "/projects" : `/projects?tech=${technology}`}>
                    <Badge variant={tech === technology ? "default" : "outline"} className="cursor-pointer">
                      {technology}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Difficulty</h2>
              <Link href={gfi === "1" ? "/projects" : "/projects?gfi=1"}>
                <Badge variant={gfi === "1" ? "default" : "outline"} className="cursor-pointer">
                  Good First Issue
                </Badge>
              </Link>
            </div>
            {trendingTags.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">Trending Tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {trendingTags.map(([label, count]) => (
                    <Badge key={label} variant="secondary" title={`${count} open issue${count === 1 ? "" : "s"}`}>
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div>
            {featured && (
              <Card className="mb-6 border-navy/30 dark:border-yellow/30">
                <CardHeader>
                  <Badge variant="secondary" className="mb-2 w-fit">
                    Featured Project
                  </Badge>
                  <CardTitle className="text-2xl">
                    <Link href={`/projects/${featured.slug}`} className="hover:underline">
                      {featured.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>{featured.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4">
                  {featured.primaryLanguage && <Badge variant="outline">{featured.primaryLanguage}</Badge>}
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="size-3.5" />
                    {featured.stargazersCount}
                  </span>
                  {featured.goodFirstIssueCount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {featured.goodFirstIssueCount} Good First Issue{featured.goodFirstIssueCount === 1 ? "" : "s"}
                    </span>
                  )}
                </CardContent>
              </Card>
            )}

            {rest.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {activeFilters ? "No projects match these filters." : "No other projects yet."}
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                {rest.map((project) => (
                  <Card key={project.id}>
                    <CardHeader>
                      <CardTitle>
                        <Link href={`/projects/${project.slug}`} className="hover:underline">
                          {project.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {project.primaryLanguage && <Badge variant="outline">{project.primaryLanguage}</Badge>}
                        {project.goodFirstIssueCount > 0 && (
                          <Badge variant="secondary">{project.goodFirstIssueCount} Good First Issue{project.goodFirstIssueCount === 1 ? "" : "s"}</Badge>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="size-3.5" />
                        {project.stargazersCount}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
