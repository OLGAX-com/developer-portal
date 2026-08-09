import Link from "next/link";
import { Award } from "lucide-react";

import { listPendingProgramApprovals } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approveProgramCompletion } from "./actions";

export default async function ProgramApprovalsAdminPage() {
  const enrollments = await listPendingProgramApprovals();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link href="/admin" className="mb-2 inline-block text-sm text-muted-foreground hover:underline">
        &larr; Admin
      </Link>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Program Approvals</h1>
      <p className="mb-8 text-muted-foreground">
        Contributors who&apos;ve met the requirements for a certification that requires manual review (currently
        just Maintainer) before the certificate is issued.
      </p>

      {enrollments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending approvals.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={enrollment.user.image ?? undefined} alt={enrollment.user.name} />
                    <AvatarFallback>{enrollment.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{enrollment.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {enrollment.user.email}
                      {enrollment.user.profile?.githubUsername ? ` · @${enrollment.user.profile.githubUsername}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1.5">
                    <Award className="size-3.5" />
                    {enrollment.program.title}
                  </Badge>
                  <Badge variant="outline">Enrolled {enrollment.startedAt.toLocaleDateString()}</Badge>
                </div>
                <form action={approveProgramCompletion.bind(null, enrollment.id)}>
                  <Button type="submit" size="sm">
                    Approve &amp; issue certificate
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
