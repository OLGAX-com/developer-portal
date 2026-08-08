import { headers } from "next/headers";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { auth } from "@olgax/auth";
import { checkAndAwardActivityXp, checkAndCompleteMissions, prisma } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { MissionCard } from "@/components/mission-card";

const MISSION_TYPE_LABEL: Record<string, string> = {
  FIRST_PR: "First PR",
  DOCUMENTATION: "Documentation",
  BUG_FIX: "Bug Fix",
  TESTING: "Testing",
  CODE_REVIEW: "Code Review",
  COMMUNITY_SUPPORT: "Community Support",
  BUG_REPORT: "QA / Bug Report",
};

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
] as const;

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { type, status } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) await checkAndCompleteMissions(session.user.id).catch(() => null);
  if (session) await checkAndAwardActivityXp(session.user.id).catch(() => null);

  // Always the same include shape (filtered to an impossible userId when signed out)
  // so the query result type doesn't vary based on auth state.
  const [missions, profile] = await Promise.all([
    prisma.mission.findMany({
      where: { isActive: true },
      include: { badge: true, userMissions: { where: { userId: session?.user.id ?? "" } } },
      orderBy: { createdAt: "asc" },
    }),
    session ? prisma.profile.findUnique({ where: { userId: session.user.id } }) : null,
  ]);

  const filtered = missions.filter((mission) => {
    if (type && mission.type !== type) return false;
    if (status && status !== "all") {
      const missionStatus = mission.userMissions[0]?.status;
      if (status === "completed" && missionStatus !== "COMPLETED") return false;
      if (status === "in-progress" && missionStatus !== "IN_PROGRESS") return false;
      if (status === "available" && missionStatus) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Missions</h1>
        {profile && <Badge variant="secondary">{profile.xp} XP total</Badge>}
      </div>
      <p className="mb-6 text-muted-foreground">
        Complete guided missions to earn XP and badges. Missions complete automatically once we sync matching
        GitHub activity from a tracked project.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Link href={{ query: { ...(status && { status }) } }}>
          <Badge variant={!type ? "default" : "outline"} className="cursor-pointer">
            All
          </Badge>
        </Link>
        {Object.entries(MISSION_TYPE_LABEL).map(([key, label]) => (
          <Link key={key} href={{ query: { type: key, ...(status && { status }) } }}>
            <Badge variant={type === key ? "default" : "outline"} className="cursor-pointer">
              {label}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={{ query: { ...(type && { type }), ...(tab.key !== "all" && { status: tab.key }) } }}
          >
            <Badge variant={(status ?? "all") === tab.key ? "default" : "outline"} className="cursor-pointer">
              {tab.label}
            </Badge>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {missions.length === 0 ? "No missions configured yet." : "No missions match these filters."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((mission) => {
            const userMission = mission.userMissions[0];
            const isCompleted = userMission?.status === "COMPLETED";

            return (
              <div key={mission.id} className="relative">
                {isCompleted && (
                  <CheckCircle2 className="absolute top-3 right-3 z-10 size-5 text-navy dark:text-yellow" />
                )}
                <MissionCard
                  title={mission.title}
                  description={mission.description}
                  type={MISSION_TYPE_LABEL[mission.type] ?? mission.type}
                  reward={mission.xpReward > 0 ? `${mission.xpReward} XP` : "Recognition"}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

