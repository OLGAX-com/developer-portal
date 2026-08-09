import type { listMentorshipMessages } from "@olgax/database";

type MentorshipMessage = Awaited<ReturnType<typeof listMentorshipMessages>>[number];

/** A short "last message" line for list rows, so you don't have to open every thread to scan them. */
export function lastMessagePreview(messages: MentorshipMessage[] | undefined, currentUserId: string): string {
  if (!messages || messages.length === 0) return "No messages yet";
  const last = messages[messages.length - 1];
  const prefix = last.senderId === currentUserId ? "You: " : "";
  const body = last.body.length > 60 ? `${last.body.slice(0, 60)}\u2026` : last.body;
  return `${prefix}${body}`;
}
