import { headers } from "next/headers";
import Link from "next/link";
import { Star, Bookmark, BookmarkCheck, Calendar, ChevronDown, MessageSquare, Video } from "lucide-react";

import { auth } from "@olgax/auth";
import {
  getLatestMentorApplication,
  listMentors,
  listMentorshipMessages,
  listMentorshipsForUser,
  listMentorshipSessions,
  listSavedMentorIds,
  prisma,
} from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptMentorship,
  applyForMentorship,
  broadcastMessage,
  declineMentorship,
  graduateMentorship,
  rateMentor,
  requestMentorship,
  saveMentor,
  scheduleGroupSession,
  scheduleSession,
  sendMessage,
  unsaveMentor,
} from "./actions";

type MentorshipMessage = Awaited<ReturnType<typeof listMentorshipMessages>>[number];

/** A short "last message" line for the collapsed accordion row, so you don't have to open every thread to scan them. */
function lastMessagePreview(messages: MentorshipMessage[] | undefined, currentUserId: string): string {
  if (!messages || messages.length === 0) return "No messages yet";
  const last = messages[messages.length - 1];
  const prefix = last.senderId === currentUserId ? "You: " : "";
  const body = last.body.length > 60 ? `${last.body.slice(0, 60)}\u2026` : last.body;
  return `${prefix}${body}`;
}

export default async function MentorshipPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const [mentors, myMentorships, currentUser, mentorApplication, savedMentorRows] = await Promise.all([
    listMentors(),
    session ? listMentorshipsForUser(session.user.id) : Promise.resolve([]),
    session ? prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }) : Promise.resolve(null),
    session ? getLatestMentorApplication(session.user.id) : Promise.resolve(null),
    session ? listSavedMentorIds(session.user.id) : Promise.resolve([]),
  ]);

  const activeMentorships = myMentorships.filter((mentorship) => mentorship.status === "ACTIVE");
  const messageableMentorships = myMentorships.filter(
    (mentorship) => mentorship.status === "ACTIVE" || mentorship.status === "GRADUATED",
  );
  const [sessionsByMentorship, messagesByMentorship] = await Promise.all([
    Promise.all(
      activeMentorships.map(async (mentorship) => [mentorship.id, await listMentorshipSessions(mentorship.id)] as const),
    ).then((rows) => new Map(rows)),
    Promise.all(
      messageableMentorships.map(
        async (mentorship) => [mentorship.id, await listMentorshipMessages(mentorship.id)] as const,
      ),
    ).then((rows) => new Map(rows)),
  ]);

  const savedMentorIds = new Set(savedMentorRows.map((row) => row.mentorId));
  const incomingRequests = session
    ? myMentorships.filter((mentorship) => mentorship.mentorId === session.user.id)
    : [];
  const activeStudents = incomingRequests.filter((mentorship) => mentorship.status === "ACTIVE");
  const myMentorshipsAsStudent = session
    ? myMentorships.filter((mentorship) => mentorship.studentId === session.user.id)
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
              {mentorApplication?.status === "PENDING" ? (
                <p className="text-sm text-muted-foreground">
                  Your mentor application is pending review by an administrator.
                </p>
              ) : (
                <form action={applyForMentorship} className="flex flex-col gap-3">
                  {mentorApplication?.status === "REJECTED" && (
                    <p className="text-sm text-muted-foreground">
                      Your last application wasn&apos;t approved
                      {mentorApplication.reviewNote ? `: ${mentorApplication.reviewNote}` : "."} You&apos;re
                      welcome to apply again.
                    </p>
                  )}
                  {mentorApplication?.status === "APPROVED" && (
                    <p className="text-sm text-muted-foreground">
                      Your mentor status was reset by an administrator. You can apply again below.
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
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {session && myMentorshipsAsStudent.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Your mentors</h2>
          <div className="flex flex-col gap-3">
            {myMentorshipsAsStudent
              .filter((mentorship) => mentorship.status === "PENDING")
              .map((mentorship) => (
                <Card key={mentorship.id}>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="mt-0.5">
                          <AvatarImage src={mentorship.mentor.image ?? undefined} alt={mentorship.mentor.name} />
                          <AvatarFallback>{mentorship.mentor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{mentorship.mentor.name}</p>
                          {mentorship.mentor.profile?.mentorAvailability && (
                            <p className="text-xs text-muted-foreground">
                              {mentorship.mentor.profile.mentorAvailability}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">{mentorship.status.toLowerCase()}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Waiting for {mentorship.mentor.name} to respond.</p>
                  </CardContent>
                </Card>
              ))}

            {myMentorshipsAsStudent
              .filter((mentorship) => mentorship.status !== "PENDING")
              .map((mentorship) => {
                const canRateThis = mentorship.status === "GRADUATED" && !mentorship.mentorRating;

                return (
                  <details
                    key={mentorship.id}
                    name="your-mentors"
                    className="group rounded-xl bg-card text-sm ring-1 ring-foreground/10"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                      <Avatar className="shrink-0">
                        <AvatarImage src={mentorship.mentor.image ?? undefined} alt={mentorship.mentor.name} />
                        <AvatarFallback>{mentorship.mentor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{mentorship.mentor.name}</span>
                          <Badge variant="outline">{mentorship.status.toLowerCase()}</Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {mentorship.status === "ACTIVE" || mentorship.status === "GRADUATED"
                            ? lastMessagePreview(messagesByMentorship.get(mentorship.id), session.user.id)
                            : `This request was ${mentorship.status.toLowerCase()}.`}
                        </p>
                      </div>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>

                    <div className="flex flex-col gap-3 border-t px-4 py-4">
                      {(mentorship.status === "DECLINED" || mentorship.status === "CANCELLED") && (
                        <p className="text-sm text-muted-foreground">
                          This request was {mentorship.status.toLowerCase()}. You can send a new request from the
                          mentors list below.
                        </p>
                      )}

                      {mentorship.status === "ACTIVE" && (
                        <div className="flex flex-col gap-2">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Calendar className="size-3.5" /> Sessions
                          </p>
                          {(sessionsByMentorship.get(mentorship.id) ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No sessions scheduled yet.</p>
                          ) : (
                            (sessionsByMentorship.get(mentorship.id) ?? []).map((mentorshipSession) => (
                              <div key={mentorshipSession.id} className="flex items-start gap-2 text-sm">
                                <Calendar className="mt-0.5 size-3.5 shrink-0 text-navy dark:text-yellow" />
                                <div>
                                  <span className="font-medium">
                                    {mentorshipSession.scheduledAt.toLocaleString()}
                                  </span>
                                  {mentorshipSession.notes && (
                                    <p className="text-xs text-muted-foreground">{mentorshipSession.notes}</p>
                                  )}
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
                            ))
                          )}
                        </div>
                      )}

                      {mentorship.status === "GRADUATED" && (
                        <div>
                          <p className="mb-2 text-xs text-muted-foreground">
                            <Link href="/profile#certificates" className="underline">
                              View your certificate
                            </Link>
                          </p>
                          {canRateThis ? (
                            <form action={rateMentor.bind(null, mentorship.id)} className="flex flex-col gap-2">
                              <p className="text-xs text-muted-foreground">You graduated! Rate your mentor:</p>
                              <select
                                name="rating"
                                required
                                className="w-fit rounded-md border bg-background px-2 py-1 text-sm"
                              >
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
                          ) : null}
                        </div>
                      )}

                      {(mentorship.status === "ACTIVE" || mentorship.status === "GRADUATED") && (
                        <MessageThread
                          mentorshipId={mentorship.id}
                          messages={messagesByMentorship.get(mentorship.id) ?? []}
                          currentUserId={session.user.id}
                          otherPartyName={mentorship.mentor.name}
                        />
                      )}
                    </div>
                  </details>
                );
              })}
          </div>
        </section>
      )}

      {incomingRequests.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Students you&apos;re mentoring</h2>
            {incomingRequests.some((mentorship) => mentorship.status === "GRADUATED") && (
              <Link href="/profile#certificates" className="text-xs text-muted-foreground underline">
                View your Certified Olgax Mentor certificate
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {incomingRequests
              .filter((mentorship) => mentorship.status === "PENDING")
              .map((mentorship) => (
                <Card key={mentorship.id}>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
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

            {incomingRequests
              .filter((mentorship) => mentorship.status !== "PENDING")
              .map((mentorship) => (
                <details
                  key={mentorship.id}
                  name="your-students"
                  className="group rounded-xl bg-card text-sm ring-1 ring-foreground/10"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                    <Avatar className="shrink-0">
                      <AvatarImage src={mentorship.student.image ?? undefined} alt={mentorship.student.name} />
                      <AvatarFallback>{mentorship.student.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{mentorship.student.name}</span>
                        <Badge variant="outline">{mentorship.status.toLowerCase()}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {mentorship.status === "ACTIVE" || mentorship.status === "GRADUATED"
                          ? lastMessagePreview(messagesByMentorship.get(mentorship.id), mentorship.mentorId)
                          : mentorship.message ?? "No message"}
                      </p>
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="flex flex-col gap-3 border-t px-4 py-4">
                    <p className="text-xs text-muted-foreground">
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
                        {(sessionsByMentorship.get(mentorship.id) ?? []).map((mentorshipSession) => (
                          <div key={mentorshipSession.id} className="flex items-start gap-2 text-sm">
                            <Calendar className="mt-0.5 size-3.5 shrink-0 text-navy dark:text-yellow" />
                            <div>
                              <span className="font-medium">{mentorshipSession.scheduledAt.toLocaleString()}</span>
                              {mentorshipSession.notes && (
                                <p className="text-xs text-muted-foreground">{mentorshipSession.notes}</p>
                              )}
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
                        <form
                          action={scheduleSession.bind(null, mentorship.id)}
                          className="flex flex-wrap items-end gap-2"
                        >
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
                      <MessageThread
                        mentorshipId={mentorship.id}
                        messages={messagesByMentorship.get(mentorship.id) ?? []}
                        currentUserId={mentorship.mentorId}
                        otherPartyName={mentorship.student.name}
                      />
                    )}
                  </div>
                </details>
              ))}
          </div>
        </section>
      )}

      {activeStudents.length > 1 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Message or schedule for multiple students</h2>
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
            const isSaved = savedMentorIds.has(mentor.id);

            return (
              <Card key={mentor.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="mt-0.5">
                      <AvatarImage src={mentor.image ?? undefined} alt={mentor.name} />
                      <AvatarFallback>{mentor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1">
                      <CardTitle>{mentor.name}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
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
                    </div>
                  </div>
                  {session && session.user.id !== mentor.id && (
                    <form action={(isSaved ? unsaveMentor : saveMentor).bind(null, mentor.id)}>
                      <Button type="submit" size="icon" variant="ghost" aria-label={isSaved ? "Unsave mentor" : "Save mentor"}>
                        {isSaved ? <BookmarkCheck className="size-4 text-navy dark:text-yellow" /> : <Bookmark className="size-4" />}
                      </Button>
                    </form>
                  )}
                </CardHeader>
                <CardContent>
                  {mentor.profile?.mentorAvailability && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      Availability: {mentor.profile.mentorAvailability}
                    </p>
                  )}
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
                    <p className="text-xs text-muted-foreground">
                      {existing.status === "PENDING" && "Your request is pending."}
                      {existing.status === "ACTIVE" &&
                        'This mentor is currently mentoring you — see "Your mentors" above.'}
                      {existing.status === "GRADUATED" &&
                        'You graduated with this mentor — see "Your mentors" above.'}
                    </p>
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

function MessageThread({
  mentorshipId,
  messages,
  currentUserId,
  otherPartyName,
}: {
  mentorshipId: string;
  messages: MentorshipMessage[];
  currentUserId: string;
  otherPartyName: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MessageSquare className="size-3.5" /> Messages
      </p>
      {messages.length > 0 && (
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                message.senderId === currentUserId
                  ? "self-end bg-navy text-white dark:bg-yellow dark:text-navy"
                  : "self-start bg-muted"
              }`}
            >
              <p>{message.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {message.senderId === currentUserId ? "You" : otherPartyName} ·{" "}
                {message.createdAt.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
      <form action={sendMessage.bind(null, mentorshipId)} className="flex items-end gap-2">
        <Textarea name="body" placeholder={`Message ${otherPartyName}...`} rows={2} required className="flex-1" />
        <Button type="submit" size="sm">
          Send
        </Button>
      </form>
    </div>
  );
}
