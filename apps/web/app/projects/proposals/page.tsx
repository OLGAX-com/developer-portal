import Link from "next/link";
import { headers } from "next/headers";
import { MapPin, MessageSquare, Users } from "lucide-react";

import { auth, hasRole } from "@olgax/auth";
import {
  getProposalApprovalRate,
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
import { proposeProject, resubmitProposal } from "./actions";

const STATUS_VARIANT = {
  PENDING: "outline",
  APPROVED: "secondary",
  REJECTED: "outline",
} as const;

const GUIDELINES = [
  { title: "Be specific", body: "Clearly define the scope and MVP of your project. Avoid vague goals." },
  { title: "Check duplicates", body: "Search existing proposals to make sure you aren't duplicating effort." },
  { title: "Architecture matters", body: "If you have a rough technical plan, mention it in the description." },
  { title: "Commitment", body: "Be prepared to lead the initial direction if it's approved." },
];

export default async function ProjectProposalsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  const isMaintainer = Boolean(user && hasRole(user.role, "MAINTAINER"));

  const [approvedProposals, myProposals, pendingCount, activeProjectCount, approvalRate] = await Promise.all([
    listApprovedProposals(),
    session ? listProposalsForUser(session.user.id) : Promise.resolve([]),
    isMaintainer ? listPendingProposals().then((rows) => rows.length) : Promise.resolve(0),
    prisma.project.count(),
    getProposalApprovalRate(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Propose a Project</h1>
        {isMaintainer && (
          <Link href="/projects/proposals/review" className="text-sm text-navy hover:underline dark:text-yellow">
            Review queue{pendingCount > 0 ? ` (${pendingCount})` : ""} →
          </Link>
        )}
      </div>
      <p className="mb-8 max-w-2xl text-muted-foreground">
        Have an idea for a new open-source project in the Olgax ecosystem? Submit it below. A maintainer or
        administrator reviews every proposal before it goes public - once approved, contributors can comment and
        join in before the repository even exists.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          {session ? (
            <section className="mb-10">
              <Card>
                <CardContent className="py-4">
                  <form action={proposeProject} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="title">Project title</Label>
                      <Input id="title" name="title" required placeholder="e.g. Olgax CLI" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="repoUrl">GitHub repository (optional)</Label>
                      <Input
                        id="repoUrl"
                        name="repoUrl"
                        type="url"
                        placeholder="https://github.com/username/repo"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        required
                        rows={5}
                        placeholder="What is it, why does it matter, who's it for?"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="technologies">Primary technologies (optional)</Label>
                      <Input id="technologies" name="technologies" placeholder="e.g. Rust, WebAssembly, React" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="desiredImpact">Desired impact (optional)</Label>
                      <select
                        id="desiredImpact"
                        name="desiredImpact"
                        defaultValue=""
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select one...</option>
                        <option value="Learning / good first project">Learning / good first project</option>
                        <option value="Internal community tool">Internal community tool</option>
                        <option value="Production-grade / user-facing">Production-grade / user-facing</option>
                      </select>
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
                      {proposal.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {proposal.technologies.map((tech) => (
                            <Badge key={tech} variant="outline">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
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
                      {proposal.status === "REJECTED" && (
                        <details className="group">
                          <summary className="cursor-pointer text-sm text-navy hover:underline dark:text-yellow">
                            Edit &amp; resubmit
                          </summary>
                          <form
                            action={resubmitProposal.bind(null, proposal.id)}
                            className="mt-3 flex flex-col gap-3"
                          >
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`title-${proposal.id}`}>Project title</Label>
                              <Input
                                id={`title-${proposal.id}`}
                                name="title"
                                required
                                defaultValue={proposal.title}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`repoUrl-${proposal.id}`}>GitHub repository (optional)</Label>
                              <Input
                                id={`repoUrl-${proposal.id}`}
                                name="repoUrl"
                                type="url"
                                defaultValue={proposal.repoUrl ?? ""}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`description-${proposal.id}`}>Description</Label>
                              <Textarea
                                id={`description-${proposal.id}`}
                                name="description"
                                required
                                rows={4}
                                defaultValue={proposal.description}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor={`technologies-${proposal.id}`}>Primary technologies (optional)</Label>
                              <Input
                                id={`technologies-${proposal.id}`}
                                name="technologies"
                                defaultValue={proposal.technologies.join(", ")}
                              />
                            </div>
                            <Button type="submit" size="sm" className="w-fit">
                              Resubmit for review
                            </Button>
                          </form>
                        </details>
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
              <p className="text-sm text-muted-foreground">
                No approved proposals yet - be the first to suggest one.
              </p>
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
                        {proposal.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {proposal.technologies.map((tech) => (
                              <Badge key={tech} variant="outline">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        )}
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

        <aside className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3 py-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="size-4 text-navy dark:text-yellow" /> Proposal Guidelines
              </h2>
              <ul className="flex flex-col gap-3 text-xs text-muted-foreground">
                {GUIDELINES.map((tip) => (
                  <li key={tip.title}>
                    <span className="font-medium text-foreground">{tip.title}: </span>
                    {tip.body}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 py-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Current Ecosystem</p>
              <div>
                <p className="text-2xl font-bold text-navy dark:text-yellow">{activeProjectCount}</p>
                <p className="text-xs text-muted-foreground">Active projects</p>
              </div>
              {approvalRate !== null && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Approval rate</span>
                    <span className="font-medium">{approvalRate}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-navy dark:bg-yellow"
                      style={{ width: `${approvalRate}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
