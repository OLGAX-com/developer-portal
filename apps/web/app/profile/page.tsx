import { headers } from "next/headers";
import Link from "next/link";
import { GitPullRequest, MessageSquare } from "lucide-react";

import { auth } from "@olgax/auth";
import { calculateLevel, checkAndCompleteMissions, listBadgesForUser, prisma } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCard } from "@/components/badge-card";
import { updateProfile } from "./actions";

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

  const [user, profile, badges] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    listBadgesForUser(session.user.id),
  ]);

  const { level, xpIntoLevel, xpToNextLevel } = calculateLevel(profile?.xp ?? 0);
  const progressPercent = Math.round((xpIntoLevel / xpToNextLevel) * 100);

  const [contributions, reviews] = profile?.githubUsername
    ? await Promise.all([
        prisma.githubIssue.findMany({
          where: { authorLogin: profile.githubUsername },
          include: { project: true },
          orderBy: { openedAt: "desc" },
          take: 15,
        }),
        prisma.githubReview.findMany({
          where: { reviewerLogin: profile.githubUsername },
          include: { issue: { include: { project: true } } },
          orderBy: { submittedAt: "desc" },
          take: 15,
        }),
      ])
    : [[], []];

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
              <Button type="submit" className="w-fit">
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
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
                  <GitPullRequest className="size-4 shrink-0 text-muted-foreground" />
                  <Link href={issue.url} className="hover:underline">
                    {issue.project.name} #{issue.number} - {issue.title}
                  </Link>
                  {issue.isMerged && (
                    <Badge variant="secondary" className="ml-auto">
                      merged
                    </Badge>
                  )}
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
                  <Badge variant="outline" className="ml-auto">
                    {review.state.toLowerCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
