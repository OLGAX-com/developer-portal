import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ExternalLink, GitPullRequest, Star, Tag } from "lucide-react";

import { auth } from "@olgax/auth";
import { prisma } from "@olgax/database";
import { getContributors, getReadme, listDocsPages } from "@olgax/github";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MarkdownContent } from "@/components/markdown-content";
import { claimIssue, releaseIssueClaim } from "@/app/tasks/actions";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      issues: {
        orderBy: { openedAt: "desc" },
        take: 20,
        include: { claims: { where: { releasedAt: null }, include: { user: true } } },
      },
      releases: { orderBy: { publishedAt: "desc" } },
      maintainers: { include: { user: true } },
    },
  });

  if (!project) notFound();

  const [readme, contributors, docsPages] = await Promise.all([
    getReadme(project.githubOwner, project.githubRepo).catch(() => null),
    getContributors(project.githubOwner, project.githubRepo).catch(() => []),
    listDocsPages(project.githubOwner, project.githubRepo).catch(() => []),
  ]);

  const openIssues = project.issues.filter((issue) => !issue.isPullRequest);
  const pullRequests = project.issues.filter((issue) => issue.isPullRequest);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          <Link
            href={`https://github.com/${project.githubOwner}/${project.githubRepo}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-4" />
          </Link>
        </div>
        <p className="text-muted-foreground">{project.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {project.primaryLanguage && <Badge variant="outline">{project.primaryLanguage}</Badge>}
          <span className="flex items-center gap-1">
            <Star className="size-3.5" /> {project.stargazersCount}
          </span>
          {project.homepageUrl && (
            <Link href={project.homepageUrl} className="hover:text-foreground hover:underline">
              {project.homepageUrl}
            </Link>
          )}
        </div>
      </div>

      {project.maintainers.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Maintainers</h2>
          <div className="flex flex-wrap gap-2">
            {project.maintainers.map(({ user }) => (
              <Badge key={user.id} variant="secondary">
                {user.name}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {contributors.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Contributors</h2>
          <div className="flex flex-wrap gap-3">
            {contributors.map((contributor) => (
              <Link
                key={contributor.login}
                href={contributor.htmlUrl}
                className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm hover:bg-muted"
              >
                <Image
                  src={contributor.avatarUrl}
                  alt={contributor.login}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                @{contributor.login}
              </Link>
            ))}
          </div>
        </section>
      )}

      {readme && (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Documentation</h2>
            {docsPages.length > 0 && (
              <Link
                href={`${process.env.NEXT_PUBLIC_DOCS_URL}/docs/projects/${project.slug}`}
                className="text-sm text-navy hover:underline dark:text-yellow"
              >
                View full documentation ({docsPages.length} pages) →
              </Link>
            )}
          </div>
          <MarkdownContent
            content={readme.content}
            linkBase={{ owner: project.githubOwner, repo: project.githubRepo, branch: project.defaultBranch, dir: "" }}
          />
        </section>
      )}

      <Separator className="mb-10" />

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Releases</h2>
        {project.releases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No releases yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {project.releases.map((release) => (
              <li key={release.id}>
                <Card>
                  <CardContent className="flex items-center justify-between py-3">
                    <Link href={release.url} className="flex items-center gap-2 font-medium hover:underline">
                      <Tag className="size-4" />
                      {release.name ?? release.tagName}
                    </Link>
                    {release.publishedAt && (
                      <span className="text-sm text-muted-foreground">
                        {release.publishedAt.toLocaleDateString()}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Issues &amp; pull requests</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Issues ({openIssues.length})</h3>
            <ul className="flex flex-col gap-2">
              {openIssues.map((issue) => {
                const activeClaim = issue.claims[0];
                const isClaimedByMe = session && activeClaim?.userId === session.user.id;

                return (
                  <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link href={`/tasks/${issue.id}`} className="text-sm hover:underline">
                        #{issue.number} {issue.title}
                      </Link>
                      {issue.assignees.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Assigned to {issue.assignees.map((login) => `@${login}`).join(", ")}
                        </p>
                      )}
                    </div>
                    {activeClaim ? (
                      isClaimedByMe ? (
                        <form action={releaseIssueClaim.bind(null, issue.id)}>
                          <Button type="submit" size="xs" variant="outline">
                            Release
                          </Button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">Claimed by {activeClaim.user.name}</span>
                      )
                    ) : session ? (
                      <form action={claimIssue.bind(null, issue.id)}>
                        <Button type="submit" size="xs" variant="outline">
                          Claim
                        </Button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Pull requests ({pullRequests.length})
            </h3>
            <ul className="flex flex-col gap-2">
              {pullRequests.map((pr) => (
                <li key={pr.id} className="flex items-center gap-1.5">
                  <GitPullRequest className="size-3.5 shrink-0 text-muted-foreground" />
                  <Link href={pr.url} className="text-sm hover:underline">
                    #{pr.number} {pr.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
