import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MessageSquare, Users } from "lucide-react";

import { auth, hasRole } from "@olgax/auth";
import { getProposal, prisma } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { addComment, joinInterest, leaveInterest } from "../actions";

export default async function ProjectProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const user = session ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  const isMaintainer = Boolean(user && hasRole(user.role, "MAINTAINER"));
  const isProposer = session?.user.id === proposal.proposerId;

  // Pending/rejected proposals are private - only the proposer and maintainers/admins can see them.
  if (proposal.status !== "APPROVED" && !isProposer && !isMaintainer) notFound();

  const isInterested = session ? proposal.interests.some((interest) => interest.userId === session.user.id) : false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/projects/proposals" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">
        &larr; All proposals
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{proposal.title}</h1>
        <Badge variant={proposal.status === "APPROVED" ? "secondary" : "outline"}>
          {proposal.status.toLowerCase()}
        </Badge>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Proposed by {proposal.proposer.name}</p>

      {proposal.status === "REJECTED" && proposal.rejectionReason && (
        <div className="mb-6 rounded-md border bg-muted/40 px-4 py-3 text-sm">
          <span className="font-medium">Not approved: </span>
          {proposal.rejectionReason}
        </div>
      )}

      {proposal.linkedProject && (
        <div className="mb-6 rounded-md border bg-muted/40 px-4 py-3 text-sm">
          This project is now live!{" "}
          <Link href={`/projects/${proposal.linkedProject.slug}`} className="text-navy hover:underline dark:text-yellow">
            View {proposal.linkedProject.name} →
          </Link>
        </div>
      )}

      <p className="mb-8 whitespace-pre-wrap text-muted-foreground">{proposal.description}</p>

      {proposal.status === "APPROVED" && (
        <>
          <section className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
              <Users className="size-5" /> {proposal.interests.length} interested
            </h2>
            {proposal.interests.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {proposal.interests.map((interest) => (
                  <span key={interest.id} className="flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm">
                    <Avatar size="sm">
                      <AvatarImage src={interest.user.image ?? undefined} alt={interest.user.name} />
                      <AvatarFallback>{interest.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {interest.user.name}
                  </span>
                ))}
              </div>
            )}
            {session ? (
              <form action={(isInterested ? leaveInterest : joinInterest).bind(null, proposal.id)}>
                <Button type="submit" variant={isInterested ? "outline" : "default"}>
                  {isInterested ? "Leave project" : "Join project"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to join this project.</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
              <MessageSquare className="size-5" /> {proposal.comments.length} comment
              {proposal.comments.length === 1 ? "" : "s"}
            </h2>
            <div className="mb-4 flex flex-col gap-3">
              {proposal.comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="flex items-start gap-3 py-3">
                    <Avatar size="sm">
                      <AvatarImage src={comment.author.image ?? undefined} alt={comment.author.name} />
                      <AvatarFallback>{comment.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{comment.author.name}</p>
                      <p className="text-sm text-muted-foreground">{comment.body}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {proposal.comments.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              )}
            </div>
            {session ? (
              <form action={addComment.bind(null, proposal.id)} className="flex flex-col gap-2">
                <Textarea name="body" required placeholder="Share your thoughts..." rows={3} />
                <Button type="submit" size="sm" className="w-fit">
                  Comment
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to comment.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
