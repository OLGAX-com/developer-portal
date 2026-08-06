import { headers } from "next/headers";

import { auth } from "@olgax/auth";
import { getLatestMentorApplication, listMentors, listMentorshipsForUser, prisma } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptMentorship,
  applyForMentorship,
  declineMentorship,
  graduateMentorship,
  requestMentorship,
} from "./actions";

export default async function MentorshipPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const [mentors, myMentorships, currentUser, mentorApplication] = await Promise.all([
    listMentors(),
    session ? listMentorshipsForUser(session.user.id) : Promise.resolve([]),
    session ? prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }) : Promise.resolve(null),
    session ? getLatestMentorApplication(session.user.id) : Promise.resolve(null),
  ]);

  const incomingRequests = session
    ? myMentorships.filter((mentorship) => mentorship.mentorId === session.user.id)
    : [];
  const isAlreadyMentor = currentUser && currentUser.role !== "VISITOR" && currentUser.role !== "CONTRIBUTOR";

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Mentorship</h1>
      <p className="mb-8 text-muted-foreground">
        Find a mentor, request guidance, and track your mentorship progress.
      </p>

      {session && !isAlreadyMentor && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Become a mentor</h2>
          <Card>
            <CardContent className="py-4">
              {!mentorApplication || mentorApplication.status === "REJECTED" ? (
                <form action={applyForMentorship} className="flex flex-col gap-3">
                  {mentorApplication?.status === "REJECTED" && (
                    <p className="text-sm text-muted-foreground">
                      Your last application wasn&apos;t approved
                      {mentorApplication.reviewNote ? `: ${mentorApplication.reviewNote}` : "."} You&apos;re
                      welcome to apply again.
                    </p>
                  )}
                  <Textarea
                    name="message"
                    required
                    placeholder="Tell us about your experience and why you'd like to mentor..."
                  />
                  <Button type="submit" className="w-fit">
                    Apply to become a mentor
                  </Button>
                </form>
              ) : mentorApplication.status === "PENDING" ? (
                <p className="text-sm text-muted-foreground">
                  Your mentor application is pending review by an administrator.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      )}

      {incomingRequests.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Students you&apos;re mentoring</h2>
          <div className="flex flex-col gap-3">
            {incomingRequests.map((mentorship) => (
              <Card key={mentorship.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{mentorship.student.name}</p>
                    <p className="text-sm text-muted-foreground">{mentorship.message ?? "No message"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        mentorship.student.profile?.university,
                        mentorship.student.profile?.location,
                        mentorship.student.profile?.age ? `${mentorship.student.profile.age} yrs` : null,
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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{mentorship.status.toLowerCase()}</Badge>
                    {mentorship.status === "PENDING" && (
                      <>
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
                      </>
                    )}
                    {mentorship.status === "ACTIVE" && (
                      <form action={graduateMentorship.bind(null, mentorship.id)}>
                        <Button type="submit" size="sm">
                          Graduate
                        </Button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <h2 className="mb-3 text-xl font-semibold">Mentors</h2>
      {mentors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No mentors yet - promote a user to the MENTOR role to list them here.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {mentors.map((mentor) => {
            const existing = myMentorships.find((mentorship) => mentorship.mentorId === mentor.id);
            const canReapply = existing && (existing.status === "DECLINED" || existing.status === "CANCELLED");

            return (
              <Card key={mentor.id}>
                <CardHeader className="flex flex-row items-center gap-3">
                  <Avatar>
                    <AvatarImage src={mentor.image ?? undefined} alt={mentor.name} />
                    <AvatarFallback>{mentor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <CardTitle>{mentor.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit">
                      {mentor.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {!session ? (
                    <p className="text-sm text-muted-foreground">Sign in to request mentorship.</p>
                  ) : session.user.id === mentor.id ? null : !existing || canReapply ? (
                    <form action={requestMentorship.bind(null, mentor.id)} className="flex flex-col gap-2">
                      {canReapply && (
                        <p className="text-xs text-muted-foreground">
                          Your previous request was declined. Update your message and try again.
                        </p>
                      )}
                      <Textarea
                        name="message"
                        placeholder="What would you like help with?"
                        defaultValue={canReapply ? (existing?.message ?? "") : ""}
                        rows={2}
                      />
                      <Button type="submit" size="sm" className="w-fit">
                        Request mentorship
                      </Button>
                    </form>
                  ) : (
                    <Badge variant="outline">Request {existing.status.toLowerCase()}</Badge>
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
