import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@olgax/auth";
import { listMentorshipMessages, prisma } from "@olgax/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "../../../actions";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ mentorshipId: string }>;
}) {
  const { mentorshipId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const mentorship = await prisma.mentorship.findUnique({
    where: { id: mentorshipId },
    include: { mentor: true, student: true },
  });
  if (!mentorship || (mentorship.mentorId !== session.user.id && mentorship.studentId !== session.user.id)) {
    notFound();
  }
  if (mentorship.status !== "ACTIVE" && mentorship.status !== "GRADUATED") notFound();

  const otherParty = mentorship.mentorId === session.user.id ? mentorship.student : mentorship.mentor;
  const messages = await listMentorshipMessages(mentorshipId);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/mentorship/dashboard/messages"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        &larr; All messages
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{otherParty.name}</h1>

      <div className="flex min-h-[300px] flex-col gap-2 rounded-lg border p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet - say hello.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[75%] rounded-md px-3 py-2 text-sm ${
                message.senderId === session.user.id
                  ? "self-end bg-navy text-white dark:bg-yellow dark:text-navy"
                  : "self-start bg-muted"
              }`}
            >
              <p>{message.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {message.senderId === session.user.id ? "You" : otherParty.name} · {message.createdAt.toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      <form action={sendMessage.bind(null, mentorshipId)} className="flex items-end gap-2">
        <Textarea name="body" placeholder={`Message ${otherParty.name}...`} rows={2} required className="flex-1" />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
