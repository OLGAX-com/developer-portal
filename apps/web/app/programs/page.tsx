import Link from "next/link";
import { headers } from "next/headers";
import { Award, Calendar, CheckCircle2, GitPullRequest, MessageSquare, Tag } from "lucide-react";

import { auth } from "@olgax/auth";
import {
  checkAndCompletePrograms,
  getProgramProgress,
  listPrograms,
  listProgramEnrollmentsForUser,
  prisma,
  type ProgramActivityItem,
} from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { enrollInProgram, unenrollFromProgram } from "./actions";

const TRACK_LABEL: Record<string, string> = {
  CONTRIBUTOR: "Contributor",
  DEVELOPER: "Developer",
  QA: "QA / Tester",
  ANALYST: "Analyst",
  MAINTAINER: "Maintainer",
};

export default async function ProgramsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) await checkAndCompletePrograms(session.user.id).catch(() => null);

  const [programs, enrollments, profile] = await Promise.all([
    listPrograms(),
    session ? listProgramEnrollmentsForUser(session.user.id) : Promise.resolve([]),
    session ? prisma.profile.findUnique({ where: { userId: session.user.id } }) : Promise.resolve(null),
  ]);

  const enrollmentByProgramId = new Map(enrollments.map((enrollment) => [enrollment.programId, enrollment]));
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status !== "CANCELLED");

  const progressByEnrollmentId = new Map(
    await Promise.all(
      activeEnrollments
        .filter((enrollment) => enrollment.status === "IN_PROGRESS")
        .map(
          async (enrollment) =>
            [
              enrollment.id,
              await getProgramProgress(enrollment, enrollment.program, profile?.githubUsername ?? null),
            ] as const,
        ),
    ),
  );

  const browsablePrograms = programs.filter((program) => {
    const enrollment = enrollmentByProgramId.get(program.id);
    return !enrollment || enrollment.status === "CANCELLED";
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Certification Programs</h1>
      <p className="mb-8 text-muted-foreground">
        Structured, fixed-duration tracks - 3 months, 6 months, or a year - that turn real contribution
        history into a public, verifiable certificate you can share.
      </p>

      {activeEnrollments.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Your programs</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeEnrollments.map((enrollment) => (
              <ActiveProgramCard
                key={enrollment.id}
                enrollment={enrollment}
                progress={progressByEnrollmentId.get(enrollment.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          {activeEnrollments.length > 0 ? "Browse more programs" : "Programs"}
        </h2>
        {browsablePrograms.length === 0 ? (
          <p className="text-sm text-muted-foreground">You&apos;re enrolled in every available program.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {browsablePrograms.map((program) => {
              const cancelledEnrollment = enrollmentByProgramId.get(program.id);

              return (
                <Card key={program.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{TRACK_LABEL[program.track] ?? program.track}</Badge>
                      <Badge variant="outline">
                        {program.durationMonths} month{program.durationMonths === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <CardTitle>{program.title}</CardTitle>
                    {program.motto && (
                      <p className="text-sm font-medium text-navy italic dark:text-yellow">{program.motto}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{program.description}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {program.minMergedPRs > 0 && <li>- {program.minMergedPRs} merged pull requests</li>}
                      {program.minIssuesOpened > 0 && <li>- {program.minIssuesOpened} issues opened</li>}
                      {program.minReviews > 0 && <li>- {program.minReviews} code reviews</li>}
                    </ul>
                    {!session ? (
                      <p className="text-sm text-muted-foreground">Sign in to enroll.</p>
                    ) : (
                      <form action={enrollInProgram.bind(null, program.slug)}>
                        <Button type="submit" size="sm" variant="outline" className="w-fit">
                          {cancelledEnrollment ? "Rejoin this track" : "Enroll"}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ActivityList({ label, icon: Icon, items, required }: {
  label: string;
  icon: typeof GitPullRequest;
  items: ProgramActivityItem[];
  required: number;
}) {
  const percent = Math.min(100, (items.length / required) * 100);

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {label}
        </span>
        <span className="text-muted-foreground">
          {items.length} / {required}
        </span>
      </div>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-navy dark:bg-yellow" style={{ width: `${percent}%` }} />
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="truncate text-xs">
              <Link href={item.url} className="hover:underline">
                {item.projectName} #{item.number} - {item.title}
              </Link>
            </li>
          ))}
          {items.length > 5 && (
            <li className="text-xs text-muted-foreground">+{items.length - 5} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

async function ActiveProgramCard({
  enrollment,
  progress,
}: {
  enrollment: Awaited<ReturnType<typeof listProgramEnrollmentsForUser>>[number];
  progress: Awaited<ReturnType<typeof getProgramProgress>> | undefined;
}) {
  const { program } = enrollment;

  const certificate =
    enrollment.status === "COMPLETED" && enrollment.certificateId
      ? await prisma.certificate.findUnique({ where: { id: enrollment.certificateId } })
      : null;

  return (
    <Card className="border-navy/30 dark:border-yellow/30">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TRACK_LABEL[program.track] ?? program.track}</Badge>
            <Badge variant="outline">
              {program.durationMonths} month{program.durationMonths === 1 ? "" : "s"}
            </Badge>
            {enrollment.status === "COMPLETED" && (
              <Badge className="bg-navy text-white dark:bg-yellow dark:text-navy">Completed</Badge>
            )}
          </div>
          {enrollment.status === "IN_PROGRESS" && (
            <form action={unenrollFromProgram.bind(null, program.id)}>
              <Button type="submit" size="xs" variant="ghost">
                Leave program
              </Button>
            </form>
          )}
        </div>
        <CardTitle className="text-xl">{program.title}</CardTitle>
        {program.motto && <p className="text-sm font-medium text-navy italic dark:text-yellow">{program.motto}</p>}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5" />
          Enrolled {enrollment.startedAt.toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {enrollment.status === "COMPLETED" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Award className="size-6 shrink-0 text-navy dark:text-yellow" />
              <p className="text-sm font-medium">You earned this certificate!</p>
            </div>
            {certificate && certificate.achievements.length > 0 && (
              <ul className="flex flex-wrap gap-2 text-xs">
                {certificate.achievements.map((achievement) => (
                  <li key={achievement} className="rounded-full bg-muted px-3 py-1">
                    {achievement}
                  </li>
                ))}
              </ul>
            )}
            {enrollment.certificateId && (
              <Link
                href={`/certificates/${enrollment.certificateId}`}
                className="flex w-fit items-center gap-1.5 text-sm font-medium text-navy hover:underline dark:text-yellow"
              >
                <CheckCircle2 className="size-4" />
                View &amp; share your certificate
              </Link>
            )}
          </div>
        ) : (
          progress && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {program.minMergedPRs > 0 && (
                  <ActivityList
                    label="Merged PRs"
                    icon={GitPullRequest}
                    items={progress.mergedPRs}
                    required={program.minMergedPRs}
                  />
                )}
                {program.minIssuesOpened > 0 && (
                  <ActivityList
                    label="Issues opened"
                    icon={Tag}
                    items={progress.issuesOpened}
                    required={program.minIssuesOpened}
                  />
                )}
                {program.minReviews > 0 && (
                  <ActivityList
                    label="Code reviews"
                    icon={MessageSquare}
                    items={progress.reviews}
                    required={program.minReviews}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {progress.meetsRequirements
                  ? "All requirements met - your certificate will be issued shortly."
                  : progress.durationElapsed
                    ? "This track's nominal length is complete - your certificate is issued as soon as the remaining requirements above are met."
                    : `${progress.daysRemaining} day${progress.daysRemaining === 1 ? "" : "s"} left in this track's nominal length (ends ${progress.requiredEndsAt.toLocaleDateString()}) - finishing the requirements above early earns your certificate right away, no need to wait.`}
              </p>
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
