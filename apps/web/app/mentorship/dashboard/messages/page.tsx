import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@olgax/auth";
import { listMessageableConversations } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { lastMessagePreview } from "../lib";

export default async function MessagesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const conversations = await listMessageableConversations(session.user.id);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Messages</h1>
      <p className="mb-6 text-muted-foreground">Every conversation from your active and graduated mentorships.</p>

      {conversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No conversations yet - message threads open up once a mentorship is active.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/mentorship/dashboard/messages/${conversation.id}`}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm hover:bg-muted"
            >
              <Avatar className="shrink-0">
                <AvatarImage src={conversation.otherParty.image ?? undefined} alt={conversation.otherParty.name} />
                <AvatarFallback>{conversation.otherParty.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{conversation.otherParty.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {lastMessagePreview(conversation.messages, session.user.id)}
                </p>
              </div>
              {conversation.needsReply && <Badge className="shrink-0">Needs your reply</Badge>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
