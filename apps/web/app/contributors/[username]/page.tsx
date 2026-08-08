import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, GitPullRequest, CircleDot, MessageSquare, Award } from "lucide-react";

import { getContributorProfile, listBadgesForUser, listCertificatesForUser } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeCard } from "@/components/badge-card";
import { ClaimProfileButton } from "@/components/claim-profile-button";

export default async function ContributorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const contributor = await getContributorProfile(decodeURIComponent(username));
  if (!contributor) notFound();

  const [badges, certificates] = contributor.userId
    ? await Promise.all([listBadgesForUser(contributor.userId), listCertificatesForUser(contributor.userId)])
    : [[], []];

  const githubUrl = `https://github.com/${contributor.githubUsername}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Card className="mb-8">
        <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-start">
          <Avatar size="lg">
            <AvatarImage src={contributor.image ?? `${githubUrl}.png`} alt={contributor.name} />
            <AvatarFallback>{contributor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-semibold">{contributor.name}</h1>
              {!contributor.isRegistered && <Badge variant="outline">Hasn&apos;t joined Olgax yet</Badge>}
            </div>
            <Link
              href={githubUrl}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:underline"
            >
              @{contributor.githubUsername} <ExternalLink className="size-3.5" />
            </Link>
            <p className="text-sm font-medium">
              Level {contributor.level} &middot; {contributor.xp} XP
            </p>
            {!contributor.isRegistered && (
              <div className="mt-2 rounded-md border bg-muted/40 px-4 py-3 text-sm">
                <p className="mb-2">
                  This XP is real credit for @{contributor.githubUsername}&apos;s merged PRs, issues, and reviews
                  across tracked Olgax projects - counted automatically, whether or not they&apos;ve signed up.
                </p>
                <ClaimProfileButton callbackURL={`/contributors/${contributor.githubUsername}`} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {contributor.isRegistered && badges.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Badges</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {badges.map(({ badge }) => (
              <BadgeCard key={badge.id} name={badge.name} description={badge.description} />
            ))}
          </div>
        </section>
      )}

      {contributor.isRegistered && certificates.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Certificates</h2>
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
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Contribution history</h2>
        {contributor.mergedPRs.length === 0 && contributor.issuesOpened.length === 0 && contributor.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No synced activity yet across tracked projects.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {contributor.mergedPRs.map((item) => (
              <Card key={`pr-${item.id}`}>
                <CardContent className="flex items-center gap-2 py-3 text-sm">
                  <GitPullRequest className="size-4 shrink-0 text-muted-foreground" />
                  <Link href={item.url} className="hover:underline">
                    {item.projectName} #{item.number} - {item.title}
                  </Link>
                  <Badge variant="secondary" className="ml-auto">
                    merged
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {contributor.issuesOpened.map((item) => (
              <Card key={`issue-${item.id}`}>
                <CardContent className="flex items-center gap-2 py-3 text-sm">
                  <CircleDot className="size-4 shrink-0 text-muted-foreground" />
                  <Link href={item.url} className="hover:underline">
                    {item.projectName} #{item.number} - {item.title}
                  </Link>
                </CardContent>
              </Card>
            ))}
            {contributor.reviews.map((item) => (
              <Card key={`review-${item.id}`}>
                <CardContent className="flex items-center gap-2 py-3 text-sm">
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <Link href={item.url} className="hover:underline">
                    Reviewed {item.projectName} #{item.number}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
