import { headers } from "next/headers";
import Link from "next/link";
import { Star, Calendar, ChevronDown, MessageSquare, Video } from "lucide-react";

import { auth } from "@olgax/auth";
import { listMentorshipsForUser, listMentorshipSessions } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  broadcastMessage,
  graduateMentorship,
  rateMentor,
  scheduleGroupSession,
  scheduleSession,
} from "../../actions";

export default async function ActiveMentorshipsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const myMentorships = await listMentorshipsForUser(session.user.id);

  const incomingRequests = myMentorships.filter((mentorship) => mentorship.mentorId === session.user.id);
  const activeStudents = incomingRequests.filter((mentorship) => mentorship.status === "ACTIVE");
  const myMentorshipsAsStudent = myMentorships.filter((mentorship) => mentorship.studentId === session.user.id);

  const nonPendingAsStudent = myMentorshipsAsStudent.filter((mentorship) => mentorship.status !== "PENDING");
  const nonPendingAsMentor = incomingRequests.filter((mentorship) => mentorship.status !== "PENDING");

  const activeMentorships = myMentorships.filter((mentorship) => mentorship.status === "ACTIVE");
  const sessionsByMentorship = new Map(
    await Promise.all(
      activeMentorships.map(async (mentorship) => [mentorship.id, await listMentorshipSessions(mentorship.id)] as const),
    ),
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Active mentorships</h1>
      <p className="mb-6 text-muted-foreground">Sessions, ratings, and graduation - as both mentor and student.</p>

      {activeStudents.length > 1 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Message or schedule for multiple students</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <MessageSquare className="size-4" /> Broadcast a message
                </p>
                <form action={broadcastMessage} className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5">
                    {activeStudents.map((mentorship) => (
                      <label key={mentorship.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="mentorshipIds" value={mentorship.id} defaultChecked />
                        {mentorship.student.name}
                      </label>
                    ))}
                  </div>
                  <Textarea name="body" required placeholder="Message to send to everyone selected..." rows={3} />
                  <Button type="submit" size="sm" className="w-fit">
                    Send to selected
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="size-4" /> Schedule a group session
                </p>
                <form action={scheduleGroupSession} className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5">
                    {activeStudents.map((mentorship) => (
                      <label key={mentorship.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="mentorshipIds" value={mentorship.id} defaultChecked />
                        {mentorship.student.name}
                      </label>
                    ))}
                  </div>
                  <Input name="scheduledAt" type="datetime-local" required />
                  <Input name="notes" placeholder="Notes (optional)" />
                  <Input name="meetingLink" type="url" placeholder="Meeting link (optional)" />
                  <Button type="submit" size="sm" className="w-fit">
                    Schedule for selected
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {nonPendingAsStudent.length === 0 && nonPendingAsMentor.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet.{" "}
          <Link href="/mentorship" className="underline">
            Browse mentors
          </Link>{" "}
          to send a request.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {nonPendingAsStudent.map((mentorship) => {
            const canRateThis = mentorship.status === "GRADUATED" && !mentorship.mentorRating;

            return (
              <details key={mentorship.id} name="active" className="group rounded-xl bg-card text-sm ring-1 ring-foreground/10">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <Avatar className="shrink-0">
                    <AvatarImage src={mentorship.mentor.image ?? undefined} alt={mentorship.mentor.name} />
                    <AvatarFallback>{mentorship.mentor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{mentorship.mentor.name}</span>
                      <Badge variant="outline">{mentorship.status.toLowerCase()}</Badge>
                      <Badge variant="secondary">You&apos;re the student</Badge>
                    </div>
                  </div>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>

                <div className="flex flex-col gap-3 border-t px-4 py-4">
                  {(mentorship.status === "DECLINED" || mentorship.status === "CANCELLED") && (
                    <p className="text-sm text-muted-foreground">
                      This request was {mentorship.status.toLowerCase()}. You can send a new request from{" "}
                      <Link href={`/mentors/${mentorship.mentorId}`} className="underline">
                        their profile
                      </Link>
                      .
                    </p>
                  )}

                  {mentorship.status === "ACTIVE" && (
                    <SessionList sessions={sessionsByMentorship.get(mentorship.id) ?? []} />
                  )}

                  {mentorship.status === "GRADUATED" &&
                    (canRateThis ? (
                      <form action={rateMentor.bind(null, mentorship.id)} className="flex flex-col gap-2">
                        <p className="text-xs text-muted-foreground">You graduated! Rate your mentor:</p>
                        <select name="rating" required className="w-fit rounded-md border bg-background px-2 py-1 text-sm">
                          <option value="">Rating</option>
                          <option value="5">5 - Excellent</option>
                          <option value="4">4 - Great</option>
                          <option value="3">3 - Good</option>
                          <option value="2">2 - Fair</option>
                          <option value="1">1 - Poor</option>
                        </select>
                        <Textarea name="review" placeholder="Optional review" rows={2} />
                        <Button type="submit" size="sm" className="w-fit">
                          Submit rating
                        </Button>
                      </form>
                    ) : mentorship.mentorRating ? (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3.5 fill-yellow text-yellow" /> You rated this mentor{" "}
                        {mentorship.mentorRating}/5
                        {mentorship.mentorReview ? ` – "${mentorship.mentorReview}"` : ""}
                      </p>
                    ) : null)}

                  {(mentorship.status === "ACTIVE" || mentorship.status === "GRADUATED") && (
                    <Link
                      href={`/mentorship/dashboard/messages/${mentorship.id}`}
                      className="flex w-fit items-center gap-1.5 text-sm text-navy hover:underline dark:text-yellow"
                    >
                      <MessageSquare className="size-4" /> Message {mentorship.mentor.name}
                    </Link>
                  )}
                </div>
              </details>
            );
          })}

          {nonPendingAsMentor.map((mentorship) => (
            <details key={mentorship.id} name="active" className="group rounded-xl bg-card text-sm ring-1 ring-foreground/10">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <Avatar className="shrink-0">
                  <AvatarImage src={mentorship.student.image ?? undefined} alt={mentorship.student.name} />
                  <AvatarFallback>{mentorship.student.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{mentorship.student.name}</span>
                    <Badge variant="outline">{mentorship.status.toLowerCase()}</Badge>
                    <Badge variant="secondary">You&apos;re the mentor</Badge>
                  </div>
                </div>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>

              <div className="flex flex-col gap-3 border-t px-4 py-4">
                <p className="text-xs text-muted-foreground">
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

                {mentorship.status === "GRADUATED" && mentorship.mentorRating && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3.5 fill-yellow text-yellow" /> {mentorship.student.name} rated you{" "}
                    {mentorship.mentorRating}/5
                    {mentorship.mentorReview ? ` – "${mentorship.mentorReview}"` : ""}
                  </p>
                )}

                {mentorship.status === "ACTIVE" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Calendar className="size-3.5" /> Sessions
                      </p>
                      <form action={graduateMentorship.bind(null, mentorship.id)}>
                        <Button type="submit" size="sm">
                          Graduate
                        </Button>
                      </form>
                    </div>
                    <SessionList sessions={sessionsByMentorship.get(mentorship.id) ?? []} />
                    <form action={scheduleSession.bind(null, mentorship.id)} className="flex flex-wrap items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`scheduledAt-${mentorship.id}`} className="text-xs">
                          Schedule a session
                        </Label>
                        <Input
                          id={`scheduledAt-${mentorship.id}`}
                          name="scheduledAt"
                          type="datetime-local"
                          required
                          className="w-fit"
                        />
                      </div>
                      <Input name="notes" placeholder="Notes (optional)" className="w-48" />
                      <Input name="meetingLink" type="url" placeholder="Meeting link (optional)" className="w-48" />
                      <Button type="submit" size="sm" variant="outline">
                        Add session
                      </Button>
                    </form>
                  </div>
                )}

                {(mentorship.status === "ACTIVE" || mentorship.status === "GRADUATED") && (
                  <Link
                    href={`/mentorship/dashboard/messages/${mentorship.id}`}
                    className="flex w-fit items-center gap-1.5 text-sm text-navy hover:underline dark:text-yellow"
                  >
                    <MessageSquare className="size-4" /> Message {mentorship.student.name}
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionList({ sessions }: { sessions: Awaited<ReturnType<typeof listMentorshipSessions>> }) {
  if (sessions.length === 0) return <p className="text-xs text-muted-foreground">No sessions scheduled yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((mentorshipSession) => (
        <div key={mentorshipSession.id} className="flex items-start gap-2 text-sm">
          <Calendar className="mt-0.5 size-3.5 shrink-0 text-navy dark:text-yellow" />
          <div>
            <span className="font-medium">{mentorshipSession.scheduledAt.toLocaleString()}</span>
            {mentorshipSession.notes && <p className="text-xs text-muted-foreground">{mentorshipSession.notes}</p>}
            {mentorshipSession.meetingLink && (
              <p>
                <a
                  href={mentorshipSession.meetingLink}
                  className="flex items-center gap-1 text-xs text-navy hover:underline dark:text-yellow"
                >
                  <Video className="size-3" /> Join meeting
                </a>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
