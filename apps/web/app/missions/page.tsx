import { headers } from "next/headers";
import { CheckCircle2 } from "lucide-react";

import { auth } from "@olgax/auth";
import { checkAndCompleteMissions, prisma } from "@olgax/database";
import { MissionCard } from "@/components/mission-card";

const MISSION_TYPE_LABEL: Record<string, string> = {
  FIRST_PR: "First PR",
  DOCUMENTATION: "Documentation",
  BUG_FIX: "Bug Fix",
  TESTING: "Testing",
  CODE_REVIEW: "Code Review",
  COMMUNITY_SUPPORT: "Community Support",
};

export default async function MissionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) await checkAndCompleteMissions(session.user.id).catch(() => null);

  // Always the same include shape (filtered to an impossible userId when signed out)
  // so the query result type doesn't vary based on auth state.
  const missions = await prisma.mission.findMany({
    where: { isActive: true },
    include: { badge: true, userMissions: { where: { userId: session?.user.id ?? "" } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Missions</h1>
      <p className="mb-8 text-muted-foreground">
        Complete guided missions to earn XP and badges. Missions complete automatically once we sync matching
        GitHub activity from a tracked project.
      </p>

      {missions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No missions configured yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {missions.map((mission) => {
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
