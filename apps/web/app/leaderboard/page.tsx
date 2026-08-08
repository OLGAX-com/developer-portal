import Link from "next/link";
import { ExternalLink, GraduationCap, Trophy } from "lucide-react";

import {
  getGlobalLeaderboard,
  getMonthlyLeaderboard,
  getProjectLeaderboard,
  getUniversityLeaderboard,
  prisma,
} from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const VIEWS = [
  { key: "global", label: "Global" },
  { key: "monthly", label: "Monthly" },
  { key: "project", label: "By Project" },
  { key: "university", label: "By University" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; project?: string }>;
}) {
  const { view: rawView, project: projectSlug } = await searchParams;
  const view: ViewKey = VIEWS.some((v) => v.key === rawView) ? (rawView as ViewKey) : "global";

  const projects = await prisma.project.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
  const selectedProject = projectSlug ? projects.find((p) => p.slug === projectSlug) : projects[0];

  const globalEntries = view === "global" ? await getGlobalLeaderboard() : null;
  const monthlyEntries = view === "monthly" ? await getMonthlyLeaderboard() : null;
  const projectEntries = view === "project" && selectedProject ? await getProjectLeaderboard(selectedProject.id) : null;
  const universityEntries = view === "university" ? await getUniversityLeaderboard() : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mb-6 text-muted-foreground">Top contributors across the Olgax ecosystem.</p>

      <div className="mb-6 flex gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={
              v.key === "project" && selectedProject
                ? `/leaderboard?view=project&project=${selectedProject.slug}`
                : `/leaderboard?view=${v.key}`
            }
          >
            <Badge variant={view === v.key ? "default" : "outline"} className="cursor-pointer">
              {v.label}
            </Badge>
          </Link>
        ))}
      </div>

      {view === "project" && projects.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/leaderboard?view=project&project=${project.slug}`}>
              <Badge variant={selectedProject?.id === project.id ? "default" : "outline"} className="cursor-pointer">
                {project.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {view === "global" && (
        <LeaderboardTable
          rows={(globalEntries ?? []).map((entry) => ({
            key: entry.githubUsername,
            githubUsername: entry.githubUsername,
            isRegistered: entry.isRegistered,
            name: entry.name,
            image: entry.image,
            rank: entry.rank,
            metric: `${entry.xp} XP`,
            sub: `Level ${entry.level}`,
          }))}
          emptyMessage="No XP earned yet. Complete a mission on the Missions page to appear here."
        />
      )}

      {view === "monthly" && (
        <LeaderboardTable
          rows={(monthlyEntries ?? []).map((entry) => ({
            key: entry.githubUsername,
            githubUsername: entry.githubUsername,
            isRegistered: entry.isRegistered,
            name: entry.name,
            image: entry.image,
            rank: entry.rank,
            metric: `${entry.mergedPullRequests} merged PR${entry.mergedPullRequests === 1 ? "" : "s"}`,
          }))}
          emptyMessage="No pull requests merged this month yet."
        />
      )}

      {view === "project" && (
        <LeaderboardTable
          rows={(projectEntries ?? []).map((entry) => ({
            key: entry.githubUsername,
            githubUsername: entry.githubUsername,
            isRegistered: entry.isRegistered,
            name: entry.name,
            image: entry.image,
            rank: entry.rank,
            metric: `${entry.mergedPullRequests} merged PR${entry.mergedPullRequests === 1 ? "" : "s"}`,
          }))}
          emptyMessage={selectedProject ? "No pull requests merged in this project yet." : "No projects tracked yet."}
        />
      )}

      {view === "university" && (
        <UniversityTable rows={universityEntries ?? []} />
      )}
    </div>
  );
}

function LeaderboardTable({
  rows,
  emptyMessage,
}: {
  rows: {
    key: string;
    githubUsername: string;
    isRegistered: boolean;
    name: string | null;
    image: string | null;
    rank: number;
    metric: string;
    sub?: string;
  }[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const podium = rows.filter((row) => row.rank <= 3);

  return (
    <div className="flex flex-col gap-6">
      {podium.length === 3 && <Podium rows={podium} />}
      <Card>
        <CardContent className="flex flex-col divide-y p-0">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 text-sm font-medium text-muted-foreground">#{row.rank}</span>
              <Link href={`/contributors/${row.githubUsername}`} className="flex flex-1 items-center gap-3">
                <Avatar size="sm">
                  <AvatarImage
                    src={row.image ?? `https://github.com/${row.githubUsername}.png`}
                    alt={row.name ?? row.key}
                  />
                  <AvatarFallback>{(row.name ?? row.key).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col">
                  <span className="font-medium hover:underline">{row.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.sub ?? `@${row.githubUsername}`}
                    {!row.isRegistered && " · Hasn't joined yet"}
                  </span>
                </div>
              </Link>
              <a
                href={`https://github.com/${row.githubUsername}`}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`@${row.githubUsername} on GitHub`}
              >
                <ExternalLink className="size-4" />
              </a>
              <span className="text-sm font-medium">{row.metric}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const PODIUM_ORDER = ["order-2 sm:order-1", "order-1 sm:order-2", "order-3 sm:order-3"];
const PODIUM_HEIGHT = ["sm:pt-6", "sm:pt-0", "sm:pt-10"];

function UniversityTable({
  rows,
}: {
  rows: { university: string; totalXp: number; contributorCount: number; rank: number }[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No university listed on any contributor&apos;s profile yet - add yours on your Profile page.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col divide-y p-0">
        {rows.map((row) => (
          <div key={row.university} className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 text-sm font-medium text-muted-foreground">#{row.rank}</span>
            <GraduationCap className="size-5 text-navy dark:text-yellow" />
            <div className="flex flex-1 flex-col">
              <span className="font-medium">{row.university}</span>
              <span className="text-xs text-muted-foreground">
                {row.contributorCount} contributor{row.contributorCount === 1 ? "" : "s"}
              </span>
            </div>
            <span className="text-sm font-medium">{row.totalXp} XP</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Podium({
  rows,
}: {
  rows: {
    key: string;
    githubUsername: string;
    isRegistered: boolean;
    name: string | null;
    image: string | null;
    rank: number;
    metric: string;
    sub?: string;
  }[];
}) {
  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {rows.map((row, index) => (
        <Link key={row.key} href={`/contributors/${row.githubUsername}`}>
          <Card className={`${PODIUM_ORDER[index]} ${PODIUM_HEIGHT[index]} h-full transition-colors hover:border-navy dark:hover:border-yellow`}>
            <CardContent className="flex flex-col items-center gap-2 py-5 text-center">
              {row.rank === 1 && <Trophy className="size-5 text-yellow" />}
              <Avatar size={row.rank === 1 ? "lg" : "default"}>
                <AvatarImage
                  src={row.image ?? `https://github.com/${row.githubUsername}.png`}
                  alt={row.name ?? row.key}
                />
                <AvatarFallback>{(row.name ?? row.key).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{row.name}</p>
                {row.sub && <p className="text-xs text-muted-foreground">{row.sub}</p>}
                {!row.isRegistered && <p className="text-xs text-muted-foreground">Hasn&apos;t joined yet</p>}
              </div>
              <Badge variant={row.rank === 1 ? "default" : "secondary"}>#{row.rank} · {row.metric}</Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

