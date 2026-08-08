import Link from "next/link";
import { Check, GitBranch, GitPullRequest, GraduationCap, Trophy, Users, Award, Handshake } from "lucide-react";

import { getGlobalLeaderboard, prisma } from "@olgax/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

/** Coarse relative time for the activity ticker - no need for a date library over a few units. */
function timeAgo(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function Home() {
  const [
    projects,
    allContributors,
    missions,
    badges,
    projectCount,
    mergedPRCount,
    certificateCount,
    recentMergedPRs,
    recentUsers,
    recentCertificates,
  ] = await Promise.all([
    prisma.project.findMany({ orderBy: { stargazersCount: "desc" }, take: 6 }),
    getGlobalLeaderboard(9999),
    prisma.mission.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" }, take: 2 }),
    prisma.badge.findMany({ orderBy: { name: "asc" }, take: 4 }),
    prisma.project.count(),
    prisma.githubIssue.count({ where: { isPullRequest: true, isMerged: true } }),
    prisma.certificate.count(),
    prisma.githubIssue.findMany({
      where: { isPullRequest: true, isMerged: true },
      include: { project: true },
      orderBy: { mergedAt: "desc" },
      take: 3,
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.certificate.findMany({ include: { user: true }, orderBy: { issueDate: "desc" }, take: 3 }),
  ]);

  const topContributors = allContributors.slice(0, 8);

  const activityFeed = [
    ...recentMergedPRs.map((pr) => ({
      text: `@${pr.authorLogin} merged a PR in ${pr.project.name}`,
      at: pr.mergedAt ?? pr.createdAt,
    })),
    ...recentUsers.map((user) => ({
      text: `${user.name} joined the platform`,
      at: user.createdAt,
    })),
    ...recentCertificates.map((certificate) => ({
      text: `${certificate.user.name} earned "${certificate.title}"`,
      at: certificate.issueDate,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const stats = [
    { icon: GitBranch, label: "Projects tracked", value: projectCount },
    { icon: Users, label: "Contributors recognized", value: allContributors.length },
    { icon: GitPullRequest, label: "Merged pull requests", value: mergedPRCount },
    { icon: Award, label: "Certificates issued", value: certificateCount },
  ];

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Olgax Community Platform",
            url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
            description:
              "An open-source community and mentorship platform for contributors, mentors, and maintainers to learn, build, and grow together.",
            sameAs: [
              "https://github.com/OLGAX-com",
              "https://discord.com/invite/EAXcCXgUz2",
            ],
          }),
        }}
      />
      <section className="border-b bg-gradient-to-b from-navy/5 to-transparent">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Learn. Build. Mentor.{" "}
            <span className="text-navy dark:text-yellow">Grow the open-source way.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Olgax is a community and mentorship platform where contributors, mentors, and
            maintainers collaborate on real open-source projects. GitHub is the source of truth for
            code &mdash; Olgax is the source of truth for community. Track your merged pull requests,
            earn XP and certificates, and get matched with a mentor to grow faster.
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

          {activityFeed.length > 0 && (
            <div className="mt-4 flex max-w-full items-center gap-2 rounded-full border bg-background/60 py-1.5 pr-4 pl-2 text-xs text-muted-foreground">
              <span className="flex shrink-0 items-center gap-1.5 font-medium text-navy dark:text-yellow">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-navy/60 dark:bg-yellow/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-navy dark:bg-yellow" />
                </span>
                Live
              </span>
              <span className="max-w-md truncate sm:max-w-lg">
                {activityFeed.map((item, index) => (
                  <span key={`${item.text}-${index}`}>
                    {index > 0 && " · "}
                    {item.text} ({timeAgo(item.at)})
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Card>
          <CardContent className="grid grid-cols-2 divide-y sm:divide-x sm:divide-y-0 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2 px-4 py-4 text-center">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-navy dark:text-yellow">
                  <stat.icon className="size-5" />
                </span>
                <span className="text-2xl font-bold tracking-tight text-navy dark:text-yellow">{stat.value}</span>
                <span className="text-xs tracking-wide text-muted-foreground uppercase">{stat.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">Why Olgax?</h2>
          <p className="text-muted-foreground">The pillars of our open-source ecosystem.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="mb-1 flex size-11 items-center justify-center rounded-lg bg-accent/15 text-navy dark:text-yellow">
                <GitBranch className="size-5" />
              </span>
              <h3 className="font-medium">Contribute to real projects</h3>
              <p className="text-sm text-muted-foreground">
                Track issues, pull requests, and reviews across every project in the ecosystem. Make a
                tangible impact.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="mb-1 flex size-11 items-center justify-center rounded-lg bg-accent/15 text-navy dark:text-yellow">
                <GraduationCap className="size-5" />
              </span>
              <h3 className="font-medium">Learn with mentorship</h3>
              <p className="text-sm text-muted-foreground">
                Get matched with mentors, complete guided missions, and graduate with a certificate.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="mb-1 flex size-11 items-center justify-center rounded-lg bg-accent/15 text-navy dark:text-yellow">
                <Trophy className="size-5" />
              </span>
              <h3 className="font-medium">Earn recognition</h3>
              <p className="text-sm text-muted-foreground">
                Level up, earn badges, and climb the leaderboards as you contribute.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="mb-1 flex size-11 items-center justify-center rounded-lg bg-accent/15 text-navy dark:text-yellow">
                <Handshake className="size-5" />
              </span>
              <h3 className="font-medium">Mentor others</h3>
              <p className="text-sm text-muted-foreground">
                Share your knowledge, guide newcomers, and earn your own Certified Mentor recognition.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="mb-4 text-2xl font-semibold sm:text-3xl">
              Developer experience meets community first
            </h2>
            <p className="mb-6 text-muted-foreground">
              Olgax is built by contributors, for contributors — clean UI, minimal setup, and
              documentation that stays in sync with the real codebase.
            </p>
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-navy dark:text-yellow" />
                Modern stack: Next.js, TypeScript, Tailwind CSS, Prisma
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-navy dark:text-yellow" />
                Sign in and start contributing in minutes with GitHub OAuth
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-navy dark:text-yellow" />
                Docs synced live from every tracked project&apos;s own GitHub repo
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-navy dark:text-yellow" />
                Open source itself — Olgax is a project you can contribute to too
              </li>
            </ul>
          </div>
          <div className="overflow-hidden rounded-xl bg-navy text-yellow ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-1.5 border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-destructive/70" />
                <span className="size-2.5 rounded-full bg-yellow/70" />
                <span className="size-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="text-xs font-medium text-yellow/80">Ready to build?</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
              <code>
                {"$ pnpm install\n$ docker compose up -d\n$ pnpm --filter @olgax/database run migrate\n$ pnpm dev\n\n> Ready on http://localhost:3000"}
              </code>
            </pre>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">Featured projects</h2>
          <Link href="/projects" className="text-sm text-navy hover:underline dark:text-yellow">
            Browse all projects →
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects tracked yet. Run{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">pnpm --filter @olgax/github run add-project</code> to
            add one.
          </p>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            {projects.map((project) => (
              <div key={project.id} className="w-72 shrink-0 snap-start">
                <ProjectCard
                  name={project.name}
                  description={project.description ?? ""}
                  href={`/projects/${project.slug}`}
                  tags={project.primaryLanguage ? [project.primaryLanguage] : []}
                  stars={project.stargazersCount}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">Top contributors</h2>
          <Link href="/leaderboard" className="text-sm text-navy hover:underline dark:text-yellow">
            View full leaderboard →
          </Link>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Real credit for real GitHub activity across the ecosystem - whether or not you&apos;ve signed up yet.
        </p>
        {topContributors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No XP earned yet - be the first on the leaderboard.</p>
        ) : (
          <Card>
            <CardContent className="grid divide-y p-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {topContributors.map((contributor) => (
                <Link
                  key={contributor.githubUsername}
                  href={`/contributors/${contributor.githubUsername}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                >
                  <Avatar size="sm">
                    <AvatarImage
                      src={contributor.image ?? `https://github.com/${contributor.githubUsername}.png`}
                      alt={contributor.name ?? contributor.githubUsername}
                    />
                    <AvatarFallback>
                      {(contributor.name ?? contributor.githubUsername).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">
                      {contributor.name} (@{contributor.githubUsername})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Level {contributor.level} · {contributor.xp} XP
                      {!contributor.isRegistered && " · Hasn't joined yet"}
                    </span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
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
      <section className="border-t bg-gradient-to-b from-transparent to-navy/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">Ready to make your first contribution?</h2>
          <p className="max-w-lg text-muted-foreground">
            Sign in with GitHub, claim credit for the work you&apos;ve already done, and start earning XP,
            badges, and certificates today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/projects">Explore Projects</Link>} />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/missions">View Missions</Link>}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

