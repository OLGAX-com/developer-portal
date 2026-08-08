import Link from "next/link";
import { headers } from "next/headers";
import { MessageCircle } from "lucide-react";

import { auth } from "@olgax/auth";
import { listMessageableConversations } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/app/mentorship/actions";

/** Site-wide floating messenger (LinkedIn-style) so a mentorship chat never has to be hunted
 * down on /mentorship - available from every page since it lives in the root layout. */
export async function ChatWidget() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const conversations = await listMessageableConversations(session.user.id);
  if (conversations.length === 0) return null;

  const needsReply = conversations.some((conversation) => conversation.needsReply);

  return (
    <details className="group fixed right-4 bottom-4 z-50">
      <summary className="relative flex size-12 cursor-pointer list-none items-center justify-center rounded-full bg-navy text-yellow shadow-lg ring-1 ring-foreground/10 [&::-webkit-details-marker]:hidden dark:bg-yellow dark:text-navy">
        <MessageCircle className="size-5" />
        {needsReply && (
          <span className="absolute top-0 right-0 size-3 rounded-full bg-destructive ring-2 ring-background" />
        )}
      </summary>

      <div className="absolute right-0 bottom-16 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl">
        <div className="border-b px-4 py-3 text-sm font-semibold">Messages</div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages[conversation.messages.length - 1] ?? null;

            return (
              <details key={conversation.id} name="chat-widget-thread" className="border-b last:border-0">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm hover:bg-muted/50">
                  <Avatar size="sm" className="shrink-0">
                    <AvatarImage src={conversation.otherParty.image ?? undefined} alt={conversation.otherParty.name} />
                    <AvatarFallback>{conversation.otherParty.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{conversation.otherParty.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lastMessage
                        ? `${lastMessage.senderId === session.user.id ? "You: " : ""}${lastMessage.body}`
                        : "No messages yet"}
                    </p>
                  </div>
                  {conversation.needsReply && <span className="size-2 shrink-0 rounded-full bg-destructive" />}
                </summary>
                <div className="flex flex-col gap-2 bg-muted/20 px-4 py-3">
                  {conversation.messages.length > 0 && (
                    <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto pr-1">
                      {conversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-[85%] rounded-md px-2.5 py-1.5 text-xs ${
                            message.senderId === session.user.id
                              ? "self-end bg-navy text-white dark:bg-yellow dark:text-navy"
                              : "self-start bg-muted"
                          }`}
                        >
                          {message.body}
                        </div>
                      ))}
                    </div>
                  )}
                  <form action={sendMessage.bind(null, conversation.id)} className="flex items-end gap-1.5">
                    <Textarea
                      name="body"
                      required
                      rows={1}
                      placeholder={`Message ${conversation.otherParty.name}...`}
                      className="min-h-8 flex-1 text-xs"
                    />
                    <Button type="submit" size="sm">
                      Send
                    </Button>
                  </form>
                </div>
              </details>
            );
          })}
        </div>
        <Link
          href="/mentorship"
          className="border-t px-4 py-2 text-center text-xs text-muted-foreground hover:underline"
        >
          Open full mentorship page →
        </Link>
      </div>
    </details>
  );
}
