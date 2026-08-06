import Link from "next/link";
import { GitBranch, GraduationCap, Trophy } from "lucide-react";

import { getGlobalLeaderboard, prisma } from "@olgax/database";
import { Button } from "@/components/ui/button";
import { ContributorCard } from "@/components/contributor-card";
import { ProjectCard } from "@/components/project-card";
import { BadgeCard } from "@/components/badge-card";
import { MissionCard } from "@/components/mission-card";

const MISSION_TYPE_LABEL: Record<string, string> = {
  FIRST_PR: "First PR",
  DOCUMENTATION: "Documentation",
  BUG_FIX: "Bug Fix",
  TESTING: "Testing",
  CODE_REVIEW: "Code Review",
  COMMUNITY_SUPPORT: "Community Support",
};

export default async function Home() {
  const [projects, topContributors, missions, badges] = await Promise.all([
    prisma.project.findMany({ orderBy: { stargazersCount: "desc" }, take: 3 }),
    getGlobalLeaderboard(3),
    prisma.mission.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" }, take: 2 }),
    prisma.badge.findMany({ orderBy: { name: "asc" }, take: 4 }),
  ]);

  return (
    <div className="flex flex-col">
      <section className="border-b bg-gradient-to-b from-navy/5 to-transparent">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Learn. Build. Mentor.{" "}
            <span className="text-navy dark:text-yellow">Grow the open-source way.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Olgax is a community and mentorship platform where contributors, mentors, and
            maintainers collaborate on real open-source projects. GitHub is the source of truth for
            code &mdash; Olgax is the source of truth for community.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/projects">Explore Projects</Link>} />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/mentorship">Find a Mentor</Link>}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3">
        <div className="flex flex-col items-center gap-2 text-center">
          <GitBranch className="size-8 text-navy dark:text-yellow" />
          <h2 className="font-medium">Contribute to real projects</h2>
          <p className="text-sm text-muted-foreground">
            Track issues, pull requests, and reviews across every project in the ecosystem.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <GraduationCap className="size-8 text-navy dark:text-yellow" />
          <h2 className="font-medium">Learn with mentorship</h2>
          <p className="text-sm text-muted-foreground">
            Get matched with mentors, complete guided missions, and graduate with a certificate.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <Trophy className="size-8 text-navy dark:text-yellow" />
          <h2 className="font-medium">Earn recognition</h2>
          <p className="text-sm text-muted-foreground">
            Level up, earn badges, and climb the leaderboards as you contribute.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold">Featured projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects tracked yet. Run{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">pnpm --filter @olgax/github run add-project</code> to
            add one.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                name={project.name}
                description={project.description ?? ""}
                href={`/projects/${project.slug}`}
                tags={project.primaryLanguage ? [project.primaryLanguage] : []}
                stars={project.stargazersCount}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold">Top contributors</h2>
        {topContributors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No XP earned yet - be the first on the leaderboard.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topContributors.map((contributor) => (
              <ContributorCard
                key={contributor.githubUsername}
                name={contributor.name ?? contributor.githubUsername}
                githubUsername={contributor.githubUsername}
                avatarUrl={contributor.image ?? undefined}
                role="Contributor"
                xp={contributor.xp}
                level={contributor.level}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold">Missions &amp; badges</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {missions.map((mission) => (
            <MissionCard
              key={mission.id}
              title={mission.title}
              description={mission.description}
              type={MISSION_TYPE_LABEL[mission.type] ?? mission.type}
              reward={mission.xpReward > 0 ? `${mission.xpReward} XP` : "Recognition"}
            />
          ))}
          {badges.map((badge) => (
            <BadgeCard key={badge.id} name={badge.name} description={badge.description} />
          ))}
        </div>
      </section>
    </div>
  );
}

