import Link from "next/link";
import { headers } from "next/headers";
import { MessageSquare, Users } from "lucide-react";

import { auth, hasRole } from "@olgax/auth";
import {
  listApprovedProposals,
  listPendingProposals,
  listProposalsForUser,
  prisma,
} from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { proposeProject } from "./actions";

const STATUS_VARIANT = {
  PENDING: "outline",
  APPROVED: "secondary",
  REJECTED: "outline",
} as const;

export default async function ProjectProposalsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  const isMaintainer = Boolean(user && hasRole(user.role, "MAINTAINER"));

  const [approvedProposals, myProposals, pendingCount] = await Promise.all([
    listApprovedProposals(),
    session ? listProposalsForUser(session.user.id) : Promise.resolve([]),
    isMaintainer ? listPendingProposals().then((rows) => rows.length) : Promise.resolve(0),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Propose a Project</h1>
        {isMaintainer && (
          <Link href="/projects/proposals/review" className="text-sm text-navy hover:underline dark:text-yellow">
            Review queue{pendingCount > 0 ? ` (${pendingCount})` : ""} →
          </Link>
        )}
      </div>
      <p className="mb-8 text-muted-foreground">
        Have an idea for a new open-source project in the Olgax ecosystem? Propose it here. A maintainer or
        administrator reviews every proposal before it goes public - once approved, contributors can comment and
        join in before the repository even exists.
      </p>

      {session ? (
        <section className="mb-10">
          <Card>
            <CardContent className="py-4">
              <form action={proposeProject} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title">Project title</Label>
                  <Input id="title" name="title" required placeholder="e.g. Olgax CLI" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    rows={4}
                    placeholder="What is it, why does it matter, who's it for?"
                  />
                </div>
                <Button type="submit" className="w-fit">
                  Submit proposal
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      ) : (
        <p className="mb-10 text-sm text-muted-foreground">Sign in to propose a project.</p>
      )}

      {myProposals.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Your proposals</h2>
          <div className="flex flex-col gap-3">
            {myProposals.map((proposal) => (
              <Card key={proposal.id}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {proposal.status === "APPROVED" ? (
                        <Link href={`/projects/proposals/${proposal.id}`} className="hover:underline">
                          {proposal.title}
                        </Link>
                      ) : (
                        proposal.title
                      )}
                    </p>
                    <Badge variant={STATUS_VARIANT[proposal.status]}>{proposal.status.toLowerCase()}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{proposal.description}</p>
                  {proposal.status === "PENDING" && (
                    <p className="text-xs text-muted-foreground">
                      Under review - it&apos;s only visible to you and maintainers until a decision is made.
                    </p>
                  )}
                  {proposal.status === "REJECTED" && proposal.rejectionReason && (
                    <p className="rounded bg-muted p-2 text-sm text-muted-foreground">
                      <span className="font-medium">Reason: </span>
                      {proposal.rejectionReason}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Approved proposals</h2>
        {approvedProposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved proposals yet - be the first to suggest one.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {approvedProposals.map((proposal) => (
              <Link key={proposal.id} href={`/projects/proposals/${proposal.id}`}>
                <Card className="transition-colors hover:border-navy dark:hover:border-yellow">
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{proposal.title}</p>
                      {proposal.linkedProject && (
                        <Badge variant="secondary">Now live: {proposal.linkedProject.name}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{proposal.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Proposed by {proposal.proposer.name}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3.5" /> {proposal._count.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" /> {proposal._count.interests} interested
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
