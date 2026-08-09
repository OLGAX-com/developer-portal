import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@olgax/auth";
import { listMentorshipsForUser } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { acceptMentorship, declineMentorship } from "../../actions";

export default async function RequestsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const myMentorships = await listMentorshipsForUser(session.user.id);

  const pendingIncoming = myMentorships.filter(
    (mentorship) => mentorship.mentorId === session.user.id && mentorship.status === "PENDING",
  );
  const pendingOutgoing = myMentorships.filter(
    (mentorship) => mentorship.studentId === session.user.id && mentorship.status === "PENDING",
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Requests</h1>
      <p className="mb-6 text-muted-foreground">Incoming requests to review, and requests you&apos;re waiting on.</p>

      {pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pending requests right now.{" "}
          <Link href="/mentorship" className="underline">
            Browse mentors
          </Link>{" "}
          to send one.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pendingIncoming.map((mentorship) => (
            <Card key={mentorship.id}>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="mt-0.5">
                      <AvatarImage src={mentorship.student.image ?? undefined} alt={mentorship.student.name} />
                      <AvatarFallback>{mentorship.student.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">Incoming request</p>
                      <p className="font-medium">{mentorship.student.name}</p>
                      {mentorship.goals && <p className="text-sm text-muted-foreground">{mentorship.goals}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[
                          mentorship.student.profile?.university,
                          mentorship.student.profile?.location,
                          mentorship.skillLevel,
                          mentorship.availability,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No profile details shared"}
                        {mentorship.student.profile?.linkedinUrl && (
                          <>
                            {" · "}
                            <a href={mentorship.student.profile.linkedinUrl} className="underline">
                              LinkedIn
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={acceptMentorship.bind(null, mentorship.id)}>
                      <Button type="submit" size="sm">
                        Accept
                      </Button>
                    </form>
                    <form action={declineMentorship.bind(null, mentorship.id)}>
                      <Button type="submit" size="sm" variant="outline">
                        Decline
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {pendingOutgoing.map((mentorship) => (
            <Card key={mentorship.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={mentorship.mentor.image ?? undefined} alt={mentorship.mentor.name} />
                    <AvatarFallback>{mentorship.mentor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Your request</p>
                    <p className="font-medium">{mentorship.mentor.name}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Waiting for {mentorship.mentor.name} to respond.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
