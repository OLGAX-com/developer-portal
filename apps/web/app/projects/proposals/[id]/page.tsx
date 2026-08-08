import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageSquare, ShieldAlert, Users, XCircle } from "lucide-react";

import { auth, hasRole } from "@olgax/auth";
import { getProposal, prisma } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { addComment, joinInterest, leaveInterest } from "../actions";
import { approveProposal, rejectProposal } from "../review/actions";

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
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Link href="/projects/proposals" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">
        &larr; All proposals
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{proposal.title}</h1>
            <Badge variant={proposal.status === "APPROVED" ? "secondary" : "outline"}>
              {proposal.status.toLowerCase()}
            </Badge>
          </div>
          <p className="mb-2 text-sm text-muted-foreground">Proposed by {proposal.proposer.name}</p>
          {(proposal.technologies.length > 0 || proposal.repoUrl) && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {proposal.technologies.map((tech) => (
                <Badge key={tech} variant="outline">
                  {tech}
                </Badge>
              ))}
              {proposal.repoUrl && (
                <Link href={proposal.repoUrl} className="text-sm text-navy hover:underline dark:text-yellow">
                  Repository →
                </Link>
              )}
            </div>
          )}

          {proposal.status === "REJECTED" && proposal.rejectionReason && (
            <div className="mb-6 rounded-md border bg-muted/40 px-4 py-3 text-sm">
              <span className="font-medium">Not approved: </span>
              {proposal.rejectionReason}
            </div>
          )}

          {proposal.linkedProject && (
            <div className="mb-6 rounded-md border bg-muted/40 px-4 py-3 text-sm">
              This project is now live!{" "}
              <Link
                href={`/projects/${proposal.linkedProject.slug}`}
                className="text-navy hover:underline dark:text-yellow"
              >
                View {proposal.linkedProject.name} →
              </Link>
            </div>
          )}

          {proposal.desiredImpact && (
            <p className="mb-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Desired impact: </span>
              {proposal.desiredImpact}
            </p>
          )}

          <h2 className="mb-2 text-lg font-semibold">Project Overview</h2>
          <p className="mb-10 whitespace-pre-wrap text-muted-foreground">{proposal.description}</p>

          {proposal.status === "APPROVED" && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                <MessageSquare className="size-5" /> Community Discussion ({proposal.comments.length})
              </h2>
              {session ? (
                <form action={addComment.bind(null, proposal.id)} className="mb-4 flex flex-col gap-2">
                  <Textarea name="body" required placeholder="Add to the discussion..." rows={3} />
                  <Button type="submit" size="sm" className="w-fit">
                    Post comment
                  </Button>
                </form>
              ) : (
                <p className="mb-4 text-sm text-muted-foreground">Sign in to comment.</p>
              )}
              <div className="flex flex-col gap-3">
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
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {isMaintainer && proposal.status === "PENDING" && (
            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <ShieldAlert className="size-4 text-navy dark:text-yellow" /> Review Status
                </h2>
                <p className="text-xs text-muted-foreground">
                  As a maintainer, you can approve this to make it public or reject it with a reason.
                </p>
                <form action={approveProposal.bind(null, proposal.id)}>
                  <Button type="submit" className="w-full">
                    <CheckCircle2 className="size-4" /> Approve Proposal
                  </Button>
                </form>
                <form action={rejectProposal.bind(null, proposal.id)} className="flex flex-col gap-2">
                  <Textarea name="reason" required placeholder="Reason for rejection" rows={2} />
                  <Button type="submit" variant="outline" className="w-full">
                    <XCircle className="size-4" /> Decline
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {proposal.status === "APPROVED" && (
            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Users className="size-4 text-navy dark:text-yellow" /> Community Interest
                </h2>
                <p className="text-xs text-muted-foreground">
                  {proposal.interests.length} contributor{proposal.interests.length === 1 ? "" : "s"} want
                  {proposal.interests.length === 1 ? "s" : ""} to join if approved.
                </p>
                {proposal.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {proposal.interests.map((interest) => (
                      <span
                        key={interest.id}
                        className="flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs"
                      >
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
                    <Button type="submit" variant={isInterested ? "outline" : "default"} className="w-full">
                      {isInterested ? "Leave project" : "Join project"}
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">Sign in to join this project.</p>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

