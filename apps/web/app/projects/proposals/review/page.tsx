import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, hasRole } from "@olgax/auth";
import { listApprovedProposals, listPendingProposals, prisma } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { approveProposal, linkProposalToProject, rejectProposal } from "./actions";

export default async function ProjectProposalReviewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!hasRole(user.role, "MAINTAINER")) redirect("/");

  const [pendingProposals, approvedProposals, projects] = await Promise.all([
    listPendingProposals(),
    listApprovedProposals(),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const unlinkedApproved = approvedProposals.filter((proposal) => !proposal.linkedProject);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link href="/projects/proposals" className="mb-2 inline-block text-sm text-muted-foreground hover:underline">
        &larr; Proposals
      </Link>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Review Project Proposals</h1>
      <p className="mb-8 text-muted-foreground">
        Approve to publish a proposal for comments and interest, or reject with a reason the proposer will see.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Pending ({pendingProposals.length})</h2>
        {pendingProposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending proposals.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingProposals.map((proposal) => (
              <Card key={proposal.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={proposal.proposer.image ?? undefined} alt={proposal.proposer.name} />
                      <AvatarFallback>{proposal.proposer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{proposal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Proposed by {proposal.proposer.name} ({proposal.proposer.email})
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{proposal.description}</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <form action={approveProposal.bind(null, proposal.id)}>
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectProposal.bind(null, proposal.id)} className="flex flex-1 flex-wrap items-end gap-2">
                      <Textarea name="reason" required placeholder="Reason for rejection" rows={1} className="min-w-48 flex-1" />
                      <Button type="submit" size="sm" variant="outline">
                        Reject
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Approved - awaiting repository</h2>
        {unlinkedApproved.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No approved proposals waiting to be linked to a real project.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {unlinkedApproved.map((proposal) => (
              <Card key={proposal.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <p className="font-medium">{proposal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {proposal._count.interests} interested &middot; {proposal._count.comments} comments
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Once you&apos;ve created the real GitHub repo and tracked it (
                    <code className="rounded bg-muted px-1 py-0.5">pnpm --filter @olgax/github run add-project</code>
                    ), link it here so the proposal points contributors to the live project.
                  </p>
                  <form action={linkProposalToProject.bind(null, proposal.id)} className="flex flex-wrap items-center gap-2">
                    <select name="projectId" required className="rounded-md border bg-background px-2 py-1.5 text-sm">
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Link
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
