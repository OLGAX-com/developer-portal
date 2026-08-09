import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, CircleDot, GitPullRequest, MessageSquare, Sparkles } from "lucide-react";

import { auth } from "@olgax/auth";
import { listXpEntriesForUser, prisma } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProfileHistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Sign in to view your history</h1>
      </div>
    );
  }

  const [profile, xpLog] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    listXpEntriesForUser(session.user.id, 200),
  ]);

  const [contributions, reviews] = profile?.githubUsername
    ? await Promise.all([
        prisma.githubIssue.findMany({
          where: { authorLogin: profile.githubUsername },
          include: { project: true },
          orderBy: { openedAt: "desc" },
          take: 100,
        }),
        prisma.githubReview.findMany({
          where: { reviewerLogin: profile.githubUsername },
          include: { issue: { include: { project: true } } },
          orderBy: { submittedAt: "desc" },
          take: 100,
        }),
      ])
    : [[], []];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link
        href="/profile"
        className="mb-6 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to profile
      </Link>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Contribution &amp; XP history</h1>
      <p className="mb-8 text-muted-foreground">The full record behind your profile - every item, in one place.</p>

      <section id="xp" className="mb-12">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">XP history</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-navy dark:text-yellow">{profile?.xp ?? 0}</span> total XP
          </p>
        </div>
        {xpLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No XP yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {xpLog.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-center gap-2 py-3 text-sm">
                  <Sparkles className="size-4 shrink-0 text-navy dark:text-yellow" />
                  <div className="flex-1">
                    <p>{entry.reason}</p>
                    <p className="text-xs text-muted-foreground">{entry.createdAt.toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className="text-navy dark:text-yellow">
                    +{entry.amount} XP
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section id="contributions">
        <h2 className="mb-3 text-xl font-semibold">Contribution history</h2>
        {!profile?.githubUsername ? (
          <p className="text-sm text-muted-foreground">Link a GitHub account to see your contribution history.</p>
        ) : contributions.length === 0 && reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No synced activity yet across tracked projects.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {contributions.map((issue) => (
              <Card key={issue.id}>
                <CardContent className="flex items-center gap-2 py-3 text-sm">
                  {issue.isPullRequest ? (
                    <GitPullRequest className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <CircleDot className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <Link href={issue.url} className="hover:underline">
                    {issue.project.name} #{issue.number} - {issue.title}
                  </Link>
                  <div className="ml-auto flex items-center gap-2">
                    {issue.isPullRequest && (
                      <Badge variant={issue.isMerged ? "secondary" : "outline"}>
                        {issue.isMerged ? "merged" : "open - not yet merged"}
                      </Badge>
                    )}
                    {issue.xpAwarded > 0 && (
                      <Badge variant="outline" className="text-navy dark:text-yellow">
                        +{issue.xpAwarded} XP
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="flex items-center gap-2 py-3 text-sm">
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <Link href={review.issue.url} className="hover:underline">
                    Reviewed {review.issue.project.name} #{review.issue.number}
                  </Link>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge variant="outline">{review.state.toLowerCase()}</Badge>
                    {review.xpAwarded > 0 && (
                      <Badge variant="outline" className="text-navy dark:text-yellow">
                        +{review.xpAwarded} XP
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
