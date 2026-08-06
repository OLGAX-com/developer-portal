import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, GitPullRequest, UserCheck } from "lucide-react";

import { auth } from "@olgax/auth";
import { getTaskDetail, listTaskComments } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime } from "@/lib/format";
import { addComment, claimIssue, releaseIssueClaim, releaseStaleIssueClaim } from "./actions";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const [task, comments] = await Promise.all([getTaskDetail(issueId), listTaskComments(issueId)]);
  if (!task) notFound();

  const activeClaim = task.claims.find((claim) => !claim.releasedAt);
  const pastClaims = task.claims.filter((claim) => claim.releasedAt);
  const isClaimedByMe = session && activeClaim?.userId === session.user.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/tasks" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">
        &larr; Task Board
      </Link>

      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{task.project.name}</Badge>
          {task.labels.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          #{task.number} {task.title}
          <Link href={task.url} className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="size-4" />
          </Link>
        </h1>

        {task.assignees.length > 0 && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCheck className="size-4 text-navy dark:text-yellow" />
            Assigned on GitHub to {task.assignees.map((login) => `@${login}`).join(", ")}
          </p>
        )}
      </div>

      <Card className="mb-8">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          {activeClaim ? (
            <div>
              <p className="text-sm">
                Claimed by <span className="font-medium">{isClaimedByMe ? "you" : activeClaim.user.name}</span> ·{" "}
                {formatRelativeTime(activeClaim.claimedAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                Once you&apos;ve opened a PR (or decided not to), release the claim for others.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nobody has claimed this task yet.</p>
          )}

          <div className="flex gap-2">
            {!session ? (
              <span className="text-sm text-muted-foreground">Sign in to claim</span>
            ) : isClaimedByMe ? (
              <form action={releaseIssueClaim.bind(null, task.id)}>
                <Button type="submit" size="sm" variant="outline">
                  Release
                </Button>
              </form>
            ) : activeClaim ? (
              <form action={releaseStaleIssueClaim.bind(null, task.id)}>
                <Button type="submit" size="sm" variant="outline">
                  Release (maintainer)
                </Button>
              </form>
            ) : (
              <form action={claimIssue.bind(null, task.id)}>
                <Button type="submit" size="sm">
                  Claim this issue
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      {pastClaims.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Previously claimed by</h2>
          <div className="flex flex-wrap gap-2">
            {pastClaims.map((claim) => (
              <Badge key={claim.id} variant="outline">
                {claim.user.name}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-xl font-semibold">
          <GitPullRequest className="size-5" />
          Discussion
        </h2>
        <div className="mb-4 flex flex-col gap-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No comments yet - ask &quot;is anyone working on this?&quot; if a claim looks stale.
            </p>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="flex gap-3 py-3">
                  <Avatar size="sm">
                    <AvatarImage src={comment.user.image ?? undefined} alt={comment.user.name} />
                    <AvatarFallback>{comment.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {comment.user.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </p>
                    <p className="text-sm">{comment.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {session && (
          <form action={addComment.bind(null, task.id)} className="flex flex-col gap-2">
            <Textarea name="body" placeholder="Are you still working on this?" rows={2} required />
            <Button type="submit" size="sm" className="w-fit">
              Comment
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
