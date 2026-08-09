import Link from "next/link";

import { listPendingMentorApplications } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approveMentorApplication, rejectMentorApplication } from "./actions";

export default async function MentorApplicationsAdminPage() {
  const applications = await listPendingMentorApplications();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
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
                    application.user.profile?.currentRole,
                    application.user.profile?.company,
                    application.user.profile?.university,
                    application.user.profile?.yearsOfExperience != null
                      ? `${application.user.profile.yearsOfExperience} yrs experience`
                      : null,
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
                  {application.user.profile?.portfolioUrl && (
                    <>
                      {" · "}
                      <a href={application.user.profile.portfolioUrl} className="underline">
                        Portfolio
                      </a>
                    </>
                  )}
                </p>
                {application.user.profile?.expertiseAreas && application.user.profile.expertiseAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {application.user.profile.expertiseAreas.map((area) => (
                      <Badge key={area} variant="outline" className="text-[11px]">
                        {area}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Why mentor: </span>
                  {application.message}
                </p>
                {application.user.profile?.mentorOffering && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Offers mentees: </span>
                    {application.user.profile.mentorOffering}
                  </p>
                )}
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
