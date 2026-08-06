import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, MessageCircle, MessagesSquare } from "lucide-react";

import { auth } from "@olgax/auth";
import { checkAndCompleteMissions, listMissionsForUser, listOnboardingSteps, prisma } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMMUNITY_LINKS } from "@/lib/community-links";
import { verifySaidHelloInDiscussions } from "./actions";

const MISSION_TYPE_LABEL: Record<string, string> = {
  FIRST_PR: "First PR",
  DOCUMENTATION: "Documentation",
  BUG_FIX: "Bug Fix",
  TESTING: "Testing",
  CODE_REVIEW: "Code Review",
  COMMUNITY_SUPPORT: "Community Support",
};

function ChecklistItem({
  label,
  done,
  action,
  href,
  actionLabel = "Mark done",
}: {
  label: string;
  done: boolean;
  action?: () => Promise<void>;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="size-4 shrink-0 text-navy dark:text-yellow" />
        ) : (
          <Circle className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className={done ? "text-muted-foreground line-through" : ""}>{label}</span>
      </div>
      {!done && href && (
        <Link href={href} className={buttonVariants({ size: "xs", variant: "outline" })}>
          {actionLabel}
        </Link>
      )}
      {!done && action && (
        <form action={action}>
          <Button type="submit" size="xs" variant="outline">
            {actionLabel}
          </Button>
        </form>
      )}
    </div>
  );
}

/** Turns a `?xCheck=` result param into a human message - shared by every live verification check. */
function checkResultMessage(status: string | undefined, subject: string): string | null {
  switch (status) {
    case "verified":
      return `Verified - we confirmed ${subject}.`;
    case "notfound":
      return `We couldn't confirm ${subject} yet. Do that, then check again.`;
    case "nogithub":
      return "Link your GitHub account first so we can check this.";
    case "notconfigured":
      return "This verification isn't set up yet - ask an admin.";
    case "error":
      return "Something went wrong verifying this - please try again.";
    default:
      return null;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ discussionCheck?: string; discordCheck?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  await checkAndCompleteMissions(session.user.id).catch(() => null);

  const [profile, missions, onboardingSteps, { discussionCheck, discordCheck }] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    listMissionsForUser(session.user.id),
    listOnboardingSteps(session.user.id),
    searchParams,
  ]);

  const doneKeys = new Set(onboardingSteps.map((step) => step.key));
  const firstPrMission = missions.find((mission) => mission.type === "FIRST_PR");
  const firstPrDone = firstPrMission?.userMissions[0]?.status === "COMPLETED";

  const discussionCheckMessage = checkResultMessage(
    discussionCheck,
    "a post from your GitHub account in Discussions",
  );
  const discordCheckMessage = checkResultMessage(discordCheck, "that you've joined our Discord");

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Welcome, {session.user.name.split(" ")[0]}</h1>
      <p className="mb-8 text-muted-foreground">Your onboarding journey and quick links.</p>

      {(discussionCheckMessage || discordCheckMessage) && (
        <div className="mb-8 flex flex-col gap-2">
          {discordCheckMessage && (
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">{discordCheckMessage}</div>
          )}
          {discussionCheckMessage && (
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">{discussionCheckMessage}</div>
          )}
        </div>
      )}

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Quick links</p>
            <div className="mt-2 flex flex-col gap-1 text-sm">
              <Link href="/projects" className="hover:underline">
                Browse Projects
              </Link>
              <Link href="/tasks" className="hover:underline">
                Task Board
              </Link>
              <Link href="/missions" className="hover:underline">
                Missions
              </Link>
              <Link href="/mentorship" className="hover:underline">
                Mentorship
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Community</p>
            <div className="mt-2 flex flex-col gap-1 text-sm">
              <Link href={COMMUNITY_LINKS.discord} className="flex items-center gap-1.5 hover:underline">
                <MessageCircle className="size-3.5" /> Discord
              </Link>
              <Link
                href={COMMUNITY_LINKS.githubDiscussions}
                className="flex items-center gap-1.5 hover:underline"
              >
                <MessagesSquare className="size-3.5" /> GitHub Discussions
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Your progress</p>
            <p className="mt-2 text-2xl font-semibold">
              Level {profile?.level ?? 1} <Badge variant="secondary">{profile?.xp ?? 0} XP</Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          <ChecklistItem label="Link your GitHub account" done={Boolean(profile?.githubUsername)} />
          <ChecklistItem
            label="Join our Discord"
            done={doneKeys.has("joined_discord")}
            href="/api/discord/authorize"
            actionLabel="Verify Discord"
          />
          <ChecklistItem
            label="Say hello in GitHub Discussions"
            done={doneKeys.has("said_hello_discussions")}
            action={verifySaidHelloInDiscussions}
            actionLabel="Check now"
          />
          <ChecklistItem label="Pick your first issue on the Task Board" done={false} />
          <ChecklistItem label="Open your first pull request" done={firstPrDone} />
        </CardContent>
      </Card>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">Missions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {missions.slice(0, 4).map((mission) => {
            const status = mission.userMissions[0]?.status;
            return (
              <Card key={mission.id}>
                <CardContent className="flex items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{mission.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {MISSION_TYPE_LABEL[mission.type] ?? mission.type}
                    </p>
                  </div>
                  <Badge variant={status === "COMPLETED" ? "secondary" : "outline"}>
                    {status === "COMPLETED" ? "Completed" : "In progress"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
