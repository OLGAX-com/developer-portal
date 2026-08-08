import Link from "next/link";
import { Flame, GitFork, Plus, SlidersHorizontal, Star, Users } from "lucide-react";

import { prisma } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function isGoodFirstIssueLabel(label: string) {
  const normalized = label.toLowerCase();
  return normalized.includes("good first issue") || normalized.includes("good-first-issue");
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ tech?: string; gfi?: string; trending?: string }>;
}) {
  const { tech, gfi, trending } = await searchParams;

  const [projects, contributorRows] = await Promise.all([
    prisma.project.findMany({
      orderBy: { stargazersCount: "desc" },
      include: { issues: { where: { isPullRequest: false, state: "open" }, select: { labels: true } } },
    }),
    prisma.githubIssue.groupBy({
      by: ["projectId", "authorLogin"],
      where: { isPullRequest: true, isMerged: true },
    }),
  ]);

  const contributorCounts = new Map<string, number>();
  for (const row of contributorRows) {
    contributorCounts.set(row.projectId, (contributorCounts.get(row.projectId) ?? 0) + 1);
  }

  const labelCounts = new Map<string, number>();
  for (const project of projects) {
    for (const issue of project.issues) {
      for (const label of issue.labels) {
        labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
      }
    }
  }
  const trendingTags = [...labelCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const trendingLabelSet = new Set(trendingTags.map(([label]) => label));

  const withCounts = projects.map((project) => ({
    ...project,
    goodFirstIssueCount: project.issues.filter((issue) => issue.labels.some(isGoodFirstIssueLabel)).length,
    contributorCount: contributorCounts.get(project.id) ?? 0,
    isTrending: project.issues.some((issue) => issue.labels.some((label) => trendingLabelSet.has(label))),
  }));

  const technologies = [...new Set(projects.map((p) => p.primaryLanguage).filter((lang): lang is string => Boolean(lang)))].sort();

  const filtered = withCounts.filter((project) => {
    if (tech && project.primaryLanguage !== tech) return false;
    if (gfi === "1" && project.goodFirstIssueCount === 0) return false;
    if (trending === "1" && !project.isTrending) return false;
    return true;
  });

  const featured = !tech && !gfi && !trending ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;

  const activeFilters = Boolean(tech) || gfi === "1" || trending === "1";

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Explore Projects</h1>
          <p className="text-muted-foreground">Find your next contribution in the Olgax ecosystem.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/projects/proposals"><Plus className="size-4" /> Propose a Project</Link>} />
      </div>

      {projects.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          No projects tracked yet. Run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            pnpm --filter @olgax/github run add-project
          </code>{" "}
          to add one.
        </p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="flex flex-col gap-6">
            <Card>
              <CardContent className="flex flex-col gap-5 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                    <SlidersHorizontal className="size-4" /> Filters
                  </h2>
                  {activeFilters && (
                    <Link href="/projects" className="text-xs text-navy hover:underline dark:text-yellow">
                      Clear all
                    </Link>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Difficulty
                  </h3>
                  <Link
                    href={gfi === "1" ? "/projects" : "/projects?gfi=1"}
                    className="flex items-center gap-2 text-sm hover:text-foreground"
                  >
                    <input type="checkbox" checked={gfi === "1"} readOnly className="accent-navy dark:accent-yellow" />
                    Good First Issue
                  </Link>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Technologies
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {technologies.map((technology) => (
                      <Link key={technology} href={tech === technology ? "/projects" : `/projects?tech=${technology}`}>
                        <Badge variant={tech === technology ? "default" : "outline"} className="cursor-pointer">
                          {technology}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>

                {trendingTags.length > 0 && (
                  <Link
                    href={trending === "1" ? "/projects" : "/projects?trending=1"}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-1.5 text-sm">
                      <Flame className="size-4 text-navy dark:text-yellow" /> Trending Only
                    </span>
                    <span
                      className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${trending === "1" ? "bg-navy dark:bg-yellow" : "bg-muted"}`}
                    >
                      <span
                        className={`size-4 rounded-full bg-background transition-transform ${trending === "1" ? "translate-x-4" : ""}`}
                      />
                    </span>
                  </Link>
                )}
              </CardContent>
            </Card>

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
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <GitFork className="size-3.5" />
                    {featured.forksCount}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="size-3.5" />
                    {featured.contributorCount}
                  </span>
                  {featured.goodFirstIssueCount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {featured.goodFirstIssueCount} Good First Issue{featured.goodFirstIssueCount === 1 ? "" : "s"}
                    </span>
                  )}
                  <Link
                    href={`/projects/${featured.slug}`}
                    className="ml-auto text-sm font-medium text-navy hover:underline dark:text-yellow"
                  >
                    Explore Project →
                  </Link>
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
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-sm font-semibold text-navy dark:text-yellow">
                          {project.name.slice(0, 2).toUpperCase()}
                        </span>
                        {project.goodFirstIssueCount > 0 && (
                          <Badge variant="secondary">Good First Issue</Badge>
                        )}
                      </div>
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
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="size-3.5" />
                          {project.stargazersCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" />
                          {project.contributorCount}
                        </span>
                      </div>
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
