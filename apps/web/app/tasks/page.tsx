import { headers } from "next/headers";
import Link from "next/link";
import { ExternalLink, UserCheck } from "lucide-react";

import { auth } from "@olgax/auth";
import { listOpenTasks, prisma, type MissionType } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import { claimIssue, releaseIssueClaim } from "./actions";

function isGoodFirstIssueLabel(label: string) {
  const normalized = label.toLowerCase();
  return normalized.includes("good first issue") || normalized.includes("good-first-issue");
}

/** Guesses which Mission type an issue's labels best match, so we can show a real XP reward - not a second, separate reward pool. */
function guessMissionType(labels: string[]): MissionType {
  const normalized = labels.map((label) => label.toLowerCase());
  if (normalized.some((label) => label.includes("bug"))) return "BUG_FIX";
  if (normalized.some((label) => label.includes("doc"))) return "DOCUMENTATION";
  if (normalized.some((label) => label.includes("test"))) return "TESTING";
  return "FIRST_PR";
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; tech?: string; gfi?: string }>;
}) {
  const { project: projectSlug, tech, gfi } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const [allTasks, missions] = await Promise.all([
    listOpenTasks(),
    prisma.mission.findMany({ where: { isActive: true }, select: { type: true, xpReward: true } }),
  ]);
  const xpRewardByType = new Map(missions.map((mission) => [mission.type, mission.xpReward]));

  const projectOptions = [...new Map(allTasks.map((task) => [task.project.slug, task.project])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  const selectedProject = projectSlug ? projectOptions.find((p) => p.slug === projectSlug) : undefined;
  const techOptions = [
    ...new Set(allTasks.map((task) => task.project.primaryLanguage).filter((lang): lang is string => Boolean(lang))),
  ].sort();

  const tasks = allTasks.filter((task) => {
    if (projectSlug && task.project.slug !== projectSlug) return false;
    if (tech && task.project.primaryLanguage !== tech) return false;
    if (gfi === "1" && !task.labels.some(isGoodFirstIssueLabel)) return false;
    return true;
  });

  const activeFilters = Boolean(projectSlug) || Boolean(tech) || gfi === "1";

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Task Board</h1>
      <p className="mb-6 text-muted-foreground">
        Open issues across every tracked project. Claim one to let others know you&apos;re working
        on it, then head to the real GitHub issue to comment and get assigned there.
      </p>

      <Card className="mb-8 border-navy/30 dark:border-yellow/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm text-muted-foreground">
            Don&apos;t see a task for what you&apos;re hitting? Run a project locally, test it, and open a
            new GitHub issue — earns XP toward the &quot;Report a bug&quot; mission.
          </p>
          {selectedProject ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={`https://github.com/${selectedProject.githubOwner}/${selectedProject.githubRepo}/issues/new`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open a new issue
                </a>
              }
            />
          ) : (
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/projects">Browse projects</Link>} />
          )}
        </CardContent>
      </Card>

      {(projectOptions.length > 1 || techOptions.length > 0) && (
        <div className="mb-8 flex flex-col gap-3">
          {projectOptions.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <Link href="/tasks">
                <Badge variant={!projectSlug ? "default" : "outline"} className="cursor-pointer">
                  All Projects
                </Badge>
              </Link>
              {projectOptions.map((project) => (
                <Link
                  key={project.slug}
                  href={{ query: { project: project.slug, ...(tech && { tech }), ...(gfi && { gfi }) } }}
                >
                  <Badge variant={projectSlug === project.slug ? "default" : "outline"} className="cursor-pointer">
                    {project.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          {techOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Link href={{ query: { ...(projectSlug && { project: projectSlug }), ...(gfi && { gfi }) } }}>
                <Badge variant={!tech ? "default" : "outline"} className="cursor-pointer">
                  Any Technology
                </Badge>
              </Link>
              {techOptions.map((technology) => (
                <Link
                  key={technology}
                  href={{ query: { tech: technology, ...(projectSlug && { project: projectSlug }), ...(gfi && { gfi }) } }}
                >
                  <Badge variant={tech === technology ? "default" : "outline"} className="cursor-pointer">
                    {technology}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          <div>
            <Link
              href={{
                query: {
                  ...(projectSlug && { project: projectSlug }),
                  ...(tech && { tech }),
                  ...(gfi !== "1" && { gfi: "1" }),
                },
              }}
            >
              <Badge variant={gfi === "1" ? "default" : "outline"} className="cursor-pointer">
                Good First Issue
              </Badge>
            </Link>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {activeFilters ? "No open issues match these filters." : "No open issues right now - check back later."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const isClaimedByMe = session && task.activeClaim?.userId === session.user.id;
            const isClaimedBySomeoneElse = task.activeClaim && !isClaimedByMe;
            const xpReward = xpRewardByType.get(guessMissionType(task.labels)) ?? 0;

            return (
              <Card key={task.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{task.project.name}</Badge>
                      {task.labels.map((label) => (
                        <Badge key={label} variant="secondary">
                          {label}
                        </Badge>
                      ))}
                      {xpReward > 0 && <Badge variant="secondary">Reward: {xpReward} XP</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">
                        #{task.number} {task.title}
                      </Link>
                      <Link href={task.url} className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                    {task.assignees.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <UserCheck className="size-3.5 text-navy dark:text-yellow" />
                        Assigned on GitHub to {task.assignees.map((login) => `@${login}`).join(", ")}
                      </p>
                    )}
                    {task.activeClaim && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Claimed by {isClaimedByMe ? "you" : task.activeClaim.user.name} ·{" "}
                        {formatRelativeTime(task.activeClaim.claimedAt)}
                      </p>
                    )}
                  </div>

                  {!session ? (
                    <span className="text-sm text-muted-foreground">Sign in to claim</span>
                  ) : isClaimedByMe ? (
                    <form action={releaseIssueClaim.bind(null, task.id)}>
                      <Button type="submit" size="sm" variant="outline">
                        Release
                      </Button>
                    </form>
                  ) : isClaimedBySomeoneElse ? (
                    <Link href={`/tasks/${task.id}`} className="text-sm text-muted-foreground hover:underline">
                      View discussion
                    </Link>
                  ) : (
                    <form action={claimIssue.bind(null, task.id)}>
                      <Button type="submit" size="sm">
                        Claim this issue
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

