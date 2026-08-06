import Link from "next/link";

import { listPendingMentorApplications } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approveMentorApplication, rejectMentorApplication } from "./actions";

export default async function MentorApplicationsAdminPage() {
  const applications = await listPendingMentorApplications();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/admin" className="mb-2 inline-block text-sm text-muted-foreground hover:underline">
        &larr; Admin
      </Link>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Mentor Applications</h1>
      <p className="mb-8 text-muted-foreground">Review and approve contributors applying to become mentors.</p>

      {applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending applications.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={application.user.image ?? undefined} alt={application.user.name} />
                    <AvatarFallback>{application.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{application.user.name}</p>
                    <p className="text-xs text-muted-foreground">{application.user.email}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[
                    application.user.profile?.university,
                    application.user.profile?.location,
                    application.user.profile?.age ? `${application.user.profile.age} yrs` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No profile details shared"}
                  {application.user.profile?.linkedinUrl && (
                    <>
                      {" · "}
                      <a href={application.user.profile.linkedinUrl} className="underline">
                        LinkedIn
                      </a>
                    </>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{application.message}</p>
                {application.user.profile?.bio && (
                  <p className="rounded bg-muted p-2 text-sm text-muted-foreground">
                    {application.user.profile.bio}
                  </p>
                )}
                <div className="flex gap-2">
                  <form action={approveMentorApplication.bind(null, application.id)}>
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectMentorApplication.bind(null, application.id)}>
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
    </div>
  );
}
