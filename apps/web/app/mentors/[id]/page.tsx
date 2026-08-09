import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, BookmarkCheck, Briefcase, GraduationCap, Link as LinkIcon, Star } from "lucide-react";

import { auth } from "@olgax/auth";
import { getMentorProfile, listSavedMentorIds } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveMentor, unsaveMentor } from "../../mentorship/actions";

export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const [mentor, savedMentorRows] = await Promise.all([
    getMentorProfile(id),
    session ? listSavedMentorIds(session.user.id) : Promise.resolve([]),
  ]);

  if (!mentor) notFound();

  const isSaved = savedMentorRows.some((row) => row.mentorId === mentor.id);
  const isSelf = session?.user.id === mentor.id;
  const profile = mentor.profile;

  const links = [
    profile?.linkedinUrl ? { label: "LinkedIn", url: profile.linkedinUrl } : null,
    profile?.githubUsername ? { label: "GitHub", url: `https://github.com/${profile.githubUsername}` } : null,
    profile?.portfolioUrl ? { label: "Portfolio", url: profile.portfolioUrl } : null,
    ...(profile?.otherLinks ?? []).map((url) => ({ label: url, url })),
  ].filter((link): link is { label: string; url: string } => Boolean(link));

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/mentorship" className="mb-6 inline-block text-sm text-muted-foreground hover:underline">
        &larr; Back to Mentorship
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar size="lg">
                <AvatarImage src={mentor.image ?? undefined} alt={mentor.name} />
                <AvatarFallback>{mentor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-semibold">{mentor.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{mentor.role}</Badge>
                  {mentor.ratingSummary.ratingCount > 0 && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="size-4 fill-yellow text-yellow" />
                      {mentor.ratingSummary.averageRating?.toFixed(1)} ({mentor.ratingSummary.ratingCount})
                    </span>
                  )}
                </div>
                {(profile?.currentRole || profile?.company) && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Briefcase className="size-3.5" />
                    {[profile?.currentRole, profile?.company].filter(Boolean).join(" at ")}
                  </p>
                )}
                {profile?.university && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <GraduationCap className="size-3.5" />
                    {profile.university}
                  </p>
                )}
                {profile?.yearsOfExperience != null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.yearsOfExperience} year{profile.yearsOfExperience === 1 ? "" : "s"} of experience
                  </p>
                )}
              </div>
            </div>
            {session && !isSelf && (
              <form action={(isSaved ? unsaveMentor : saveMentor).bind(null, mentor.id)}>
                <Button type="submit" size="icon" variant="ghost" aria-label={isSaved ? "Unsave mentor" : "Save mentor"}>
                  {isSaved ? (
                    <BookmarkCheck className="size-4 text-navy dark:text-yellow" />
                  ) : (
                    <Bookmark className="size-4" />
                  )}
                </Button>
              </form>
            )}
          </div>

          {profile?.expertiseAreas && profile.expertiseAreas.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">Expertise</p>
              <div className="flex flex-wrap gap-2">
                {profile.expertiseAreas.map((area) => (
                  <Badge key={area} variant="outline">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {profile?.mentorOffering && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">What they offer mentees</p>
              <p className="text-sm">{profile.mentorOffering}</p>
            </div>
          )}

          {profile?.whyMentor && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">Why they mentor</p>
              <p className="text-sm text-muted-foreground">{profile.whyMentor}</p>
            </div>
          )}

          {profile?.mentorAvailability && (
            <p className="text-sm text-muted-foreground">Availability: {profile.mentorAvailability}</p>
          )}

          {links.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  className="flex items-center gap-1 text-sm text-navy hover:underline dark:text-yellow"
                >
                  <LinkIcon className="size-3.5" />
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            {!session ? (
              <p className="text-sm text-muted-foreground">
                <Link href="/mentorship" className="underline">
                  Sign in
                </Link>{" "}
                to request mentorship.
              </p>
            ) : isSelf ? null : (
              <Button
                nativeButton={false}
                render={<Link href={`/mentorship/request/${mentor.id}`}>Request mentorship</Link>}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
