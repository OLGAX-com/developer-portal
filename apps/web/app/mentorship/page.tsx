import Link from "next/link";
import { headers } from "next/headers";
import { Bookmark, BookmarkCheck, Star, UserCog } from "lucide-react";

import { auth } from "@olgax/auth";
import { listMentors, listMentorshipsForUser, listSavedMentorIds } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveMentor, unsaveMentor } from "./actions";

export default async function MentorshipPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const [mentors, savedMentorRows, myMentorships] = await Promise.all([
    listMentors(),
    session ? listSavedMentorIds(session.user.id) : Promise.resolve([]),
    session ? listMentorshipsForUser(session.user.id) : Promise.resolve([]),
  ]);

  const savedMentorIds = new Set(savedMentorRows.map((row) => row.mentorId));
  const hasMentorshipActivity = myMentorships.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">Mentorship</h1>
          <p className="max-w-xl text-muted-foreground">
            Browse mentors across the Olgax community. Click a profile to see their background, expertise, and
            experience before requesting mentorship.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session && hasMentorshipActivity && (
            <Button variant="outline" nativeButton={false} render={<Link href="/mentorship/dashboard">Your dashboard</Link>} />
          )}
          <Button
            nativeButton={false}
            render={
              <Link href="/mentorship/apply">
                <UserCog className="size-4" />
                Become a Mentor
              </Link>
            }
          />
        </div>
      </div>

      <h2 className="mb-3 text-xl font-semibold">Mentors</h2>
      {mentors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No mentors yet - be the first to apply above.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((mentor) => {
            const isSaved = savedMentorIds.has(mentor.id);
            const isSelf = session?.user.id === mentor.id;

            return (
              <Card key={mentor.id} className="transition-colors hover:border-navy dark:hover:border-yellow">
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <Link href={`/mentors/${mentor.id}`} className="flex flex-1 items-start gap-3">
                    <Avatar className="mt-0.5">
                      <AvatarImage src={mentor.image ?? undefined} alt={mentor.name} />
                      <AvatarFallback>{mentor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="font-medium">{mentor.name}</p>
                      {(mentor.profile?.currentRole || mentor.profile?.company) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {[mentor.profile?.currentRole, mentor.profile?.company].filter(Boolean).join(" at ")}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="w-fit">
                          {mentor.role}
                        </Badge>
                        {mentor.ratingSummary.ratingCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="size-3.5 fill-yellow text-yellow" />
                            {mentor.ratingSummary.averageRating?.toFixed(1)} ({mentor.ratingSummary.ratingCount})
                          </span>
                        )}
                      </div>
                      {mentor.profile?.expertiseAreas && mentor.profile.expertiseAreas.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {mentor.profile.expertiseAreas.slice(0, 3).map((area) => (
                            <Badge key={area} variant="outline" className="text-[11px]">
                              {area}
                            </Badge>
                          ))}
                          {mentor.profile.expertiseAreas.length > 3 && (
                            <Badge variant="outline" className="text-[11px]">
                              +{mentor.profile.expertiseAreas.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                  {session && !isSelf && (
                    <form action={(isSaved ? unsaveMentor : saveMentor).bind(null, mentor.id)}>
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        aria-label={isSaved ? "Unsave mentor" : "Save mentor"}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="size-4 text-navy dark:text-yellow" />
                        ) : (
                          <Bookmark className="size-4" />
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
