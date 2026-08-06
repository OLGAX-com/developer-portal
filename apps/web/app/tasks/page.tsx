import { headers } from "next/headers";
import Link from "next/link";
import { ExternalLink, UserCheck } from "lucide-react";

import { auth } from "@olgax/auth";
import { listOpenTasks } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import { claimIssue, releaseIssueClaim } from "./actions";

export default async function TasksPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const tasks = await listOpenTasks();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Task Board</h1>
      <p className="mb-8 text-muted-foreground">
        Open issues across every tracked project. Claim one to let others know you&apos;re working
        on it, then head to the real GitHub issue to comment and get assigned there.
      </p>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open issues right now - check back later.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const isClaimedByMe = session && task.activeClaim?.userId === session.user.id;
            const isClaimedBySomeoneElse = task.activeClaim && !isClaimedByMe;

            return (
              <Card key={task.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{task.project.name}</Badge>
                      {task.labels.map((label) => (
                        <Badge key={label} variant="secondary">
                          {label}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">
                        #{task.number} {task.title}
                      </Link>
                      <Link href={task.url} className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                    {task.assignees.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <UserCheck className="size-3.5 text-navy dark:text-yellow" />
                        Assigned on GitHub to {task.assignees.map((login) => `@${login}`).join(", ")}
                      </p>
                    )}
                    {task.activeClaim && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Claimed by {isClaimedByMe ? "you" : task.activeClaim.user.name} ·{" "}
                        {formatRelativeTime(task.activeClaim.claimedAt)}
                      </p>
                    )}
                  </div>

                  {!session ? (
                    <span className="text-sm text-muted-foreground">Sign in to claim</span>
                  ) : isClaimedByMe ? (
                    <form action={releaseIssueClaim.bind(null, task.id)}>
                      <Button type="submit" size="sm" variant="outline">
                        Release
                      </Button>
                    </form>
                  ) : isClaimedBySomeoneElse ? (
                    <Link href={`/tasks/${task.id}`} className="text-sm text-muted-foreground hover:underline">
                      View discussion
                    </Link>
                  ) : (
                    <form action={claimIssue.bind(null, task.id)}>
                      <Button type="submit" size="sm">
                        Claim this issue
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
