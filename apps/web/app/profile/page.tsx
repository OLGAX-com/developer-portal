import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight, Award, CircleDot, GitPullRequest, MessageSquare, Sparkles } from "lucide-react";

import { auth, hasRole } from "@olgax/auth";
import {
  calculateLevel,
  checkAndAwardActivityXp,
  checkAndCompleteMissions,
  listBadgesForUser,
  listCertificatesForUser,
  listXpEntriesForUser,
  prisma,
} from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCard } from "@/components/badge-card";
import { updateProfile } from "./actions";

// Full history lives at /profile/history - the profile page only previews the most recent few.
const PREVIEW_LIMIT = 5;

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Sign in to view your profile</h1>
        <p className="text-muted-foreground">
          Your XP, level, badges, and contribution history will show up here once you&apos;re signed in.
        </p>
      </div>
    );
  }

  await checkAndCompleteMissions(session.user.id).catch(() => {});
  await checkAndAwardActivityXp(session.user.id).catch(() => {});

  const [user, profile, badges, certificates, xpLogPreview] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    listBadgesForUser(session.user.id),
    listCertificatesForUser(session.user.id),
    listXpEntriesForUser(session.user.id, PREVIEW_LIMIT + 1),
  ]);

  const xpLog = xpLogPreview.slice(0, PREVIEW_LIMIT);
  const hasMoreXp = xpLogPreview.length > PREVIEW_LIMIT;

  const { level, xpIntoLevel, xpToNextLevel } = calculateLevel(profile?.xp ?? 0);
  const progressPercent = Math.round((xpIntoLevel / xpToNextLevel) * 100);

  const [contributionsPreview, reviewsPreview] = profile?.githubUsername
    ? await Promise.all([
        prisma.githubIssue.findMany({
          where: { authorLogin: profile.githubUsername },
          include: { project: true },
          orderBy: { openedAt: "desc" },
          take: PREVIEW_LIMIT + 1,
        }),
        prisma.githubReview.findMany({
          where: { reviewerLogin: profile.githubUsername },
          include: { issue: { include: { project: true } } },
          orderBy: { submittedAt: "desc" },
          take: PREVIEW_LIMIT + 1,
        }),
      ])
    : [[], []];

  const contributions = contributionsPreview.slice(0, PREVIEW_LIMIT);
  const reviews = reviewsPreview.slice(0, PREVIEW_LIMIT);
  const hasMoreContributions = contributionsPreview.length > PREVIEW_LIMIT || reviewsPreview.length > PREVIEW_LIMIT;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Card className="mb-8">
        <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-start">
          <Avatar size="lg">
            <AvatarImage src={session.user.image ?? undefined} alt={session.user.name} />
            <AvatarFallback>{session.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-semibold">{session.user.name}</h1>
              <Badge variant="secondary">{user.role}</Badge>
            </div>
            {profile?.githubUsername ? (
              <Link
                href={`https://github.com/${profile.githubUsername}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                @{profile.githubUsername}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                No GitHub account linked yet - sign in with GitHub to track contributions.
              </p>
            )}
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">Level {level}</span>
                <span className="text-muted-foreground">
                  {xpIntoLevel} / {xpToNextLevel} XP
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-navy dark:bg-yellow"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">About you</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Shared with mentors and admins when you apply to mentor or request mentorship.
        </p>
        <Card>
          <CardContent className="py-4">
            <form action={updateProfile} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="bio">Bio / career history</Label>
                <Textarea id="bio" name="bio" defaultValue={profile?.bio ?? ""} rows={3} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="university">Education / university</Label>
                <Input id="university" name="university" defaultValue={profile?.university ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue={profile?.location ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="age">Age (optional)</Label>
                <Input id="age" name="age" type="number" min={0} defaultValue={profile?.age ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="linkedinUrl">LinkedIn (optional)</Label>
                <Input
                  id="linkedinUrl"
                  name="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  defaultValue={profile?.linkedinUrl ?? ""}
                />
              </div>
              {hasRole(user.role, "MENTOR") && (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="mentorAvailability">Mentorship availability (optional)</Label>
                  <Input
                    id="mentorAvailability"
                    name="mentorAvailability"
                    placeholder="e.g. Available weekends"
                    defaultValue={profile?.mentorAvailability ?? ""}
                  />
                </div>
              )}
              <Button type="submit" className="w-fit">
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section id="xp-history" className="mb-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">XP history</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-navy dark:text-yellow">{profile?.xp ?? 0}</span> total XP
          </p>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          The exact same XP that sets your level above and your spot on the{" "}
          <Link href="/leaderboard" className="underline">
            leaderboard
          </Link>{" "}
          - every entry below is a real, itemized reason you earned it.
        </p>
        {xpLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No XP yet - merged pull requests, opened issues, code reviews, and completed missions on
            tracked projects all earn XP.
          </p>
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
        {hasMoreXp && (
          <Link
            href="/profile/history#xp"
            className="mt-2 flex w-fit items-center gap-1 text-sm font-medium text-navy hover:underline dark:text-yellow"
          >
            View all XP history
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Badges</h2>
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No badges earned yet - complete a mission to earn your first one.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {badges.map(({ badge }) => (
              <BadgeCard key={badge.id} name={badge.name} description={badge.description} />
            ))}
          </div>
        )}
      </section>

      <section id="certificates" className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Certificates</h2>
        {certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No certificates yet - graduate a mentorship or complete a certification program to earn one.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {certificates.map((certificate) => (
              <Link key={certificate.id} href={`/certificates/${certificate.id}`}>
                <Card className="h-full transition-colors hover:border-navy dark:hover:border-yellow">
                  <CardContent className="flex items-start gap-3 py-4">
                    <Award className="mt-0.5 size-5 shrink-0 text-navy dark:text-yellow" />
                    <div>
                      <p className="font-medium">{certificate.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Issued {certificate.issueDate.toLocaleDateString()}
                        {certificate.mentorName ? ` · Mentor: ${certificate.mentorName}` : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
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
        {hasMoreContributions && (
          <Link
            href="/profile/history#contributions"
            className="mt-2 flex w-fit items-center gap-1 text-sm font-medium text-navy hover:underline dark:text-yellow"
          >
            View all contribution history
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </section>
    </div>
  );
}
