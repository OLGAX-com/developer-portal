import { headers } from "next/headers";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { auth, hasRole } from "@olgax/auth";
import { MENTOR_EXPERTISE_AREAS, prisma } from "@olgax/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitMentorApplication } from "./actions";

export default async function BecomeMentorPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; updated?: string }>;
}) {
  const [session, { submitted, updated }] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    searchParams,
  ]);

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Sign in to become a mentor</h1>
        <Link href="/mentorship" className="text-sm text-navy hover:underline dark:text-yellow">
          Back to Mentorship
        </Link>
      </div>
    );
  }

  const [user, profile, application] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    prisma.mentorApplication.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const isMentor = hasRole(user.role, "MENTOR");

  if (!isMentor && application?.status === "PENDING") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold">Application pending</h1>
        <p className="text-muted-foreground">
          Your mentor application is being reviewed by an administrator. We&apos;ll notify you once there&apos;s an
          update.
        </p>
        <Link href="/mentorship" className="mt-4 inline-block text-sm text-navy hover:underline dark:text-yellow">
          Back to Mentorship
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-16 sm:px-4">
      <Link href="/mentorship" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">
        &larr; Back to Mentorship
      </Link>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        {isMentor ? "Edit your mentor profile" : "Become a Mentor"}
      </h1>
      <p className="mb-6 text-muted-foreground">
        {isMentor
          ? "Keep this up to date - it's what students see on your public profile."
          : "Tell us about your background and what you can offer mentees. An administrator reviews every application."}
      </p>

      {(submitted || updated) && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-navy/30 bg-navy/5 px-4 py-3 text-sm text-navy dark:border-yellow/30 dark:bg-yellow/5 dark:text-yellow">
          <CheckCircle2 className="size-4 shrink-0" />
          {submitted ? "Your application has been submitted for review." : "Your mentor profile was updated."}
        </div>
      )}

      {!isMentor && application?.status === "REJECTED" && (
        <div className="mb-6 rounded-md border px-4 py-3 text-sm text-muted-foreground">
          Your last application wasn&apos;t approved{application.reviewNote ? `: ${application.reviewNote}` : "."} You&apos;re
          welcome to apply again below.
        </div>
      )}

      <Card>
        <CardContent className="py-6">
          <form action={submitMentorApplication} className="flex flex-col gap-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">Background</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="currentRole">Current role</Label>
                  <Input
                    id="currentRole"
                    name="currentRole"
                    placeholder="e.g. Senior Software Engineer"
                    defaultValue={profile?.currentRole ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="company">Company (optional)</Label>
                  <Input
                    id="company"
                    name="company"
                    placeholder="e.g. Acme Corp"
                    defaultValue={profile?.company ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="university">Education / qualifications</Label>
                  <Input
                    id="university"
                    name="university"
                    placeholder="e.g. BSc Computer Science, MIT"
                    defaultValue={profile?.university ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="yearsOfExperience">Years of experience</Label>
                  <Input
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    type="number"
                    min={0}
                    defaultValue={profile?.yearsOfExperience ?? ""}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">Expertise</h2>
              <Label className="mb-2 block">Pick every area you can mentor in</Label>
              <div className="flex flex-wrap gap-2">
                {MENTOR_EXPERTISE_AREAS.map((area) => (
                  <label
                    key={area}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm has-checked:border-navy has-checked:bg-navy/10 has-checked:text-navy dark:has-checked:border-yellow dark:has-checked:bg-yellow/10 dark:has-checked:text-yellow"
                  >
                    <input
                      type="checkbox"
                      name="expertiseAreas"
                      value={area}
                      defaultChecked={profile?.expertiseAreas?.includes(area)}
                      className="sr-only"
                    />
                    {area}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase">Motivation</h2>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="whyMentor">Why do you want to mentor?</Label>
                <Textarea id="whyMentor" name="whyMentor" required rows={3} defaultValue={profile?.whyMentor ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mentorOffering">What can you offer mentees?</Label>
                <Textarea
                  id="mentorOffering"
                  name="mentorOffering"
                  required
                  rows={3}
                  placeholder="Code reviews, career advice, weekly check-ins..."
                  defaultValue={profile?.mentorOffering ?? ""}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase">Links</h2>
              {profile?.githubUsername && (
                <div className="flex flex-col gap-1.5">
                  <Label>GitHub (linked)</Label>
                  <p className="text-sm text-muted-foreground">@{profile.githubUsername}</p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="linkedinUrl">LinkedIn</Label>
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    defaultValue={profile?.linkedinUrl ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="portfolioUrl">Portfolio website (optional)</Label>
                  <Input
                    id="portfolioUrl"
                    name="portfolioUrl"
                    type="url"
                    placeholder="https://..."
                    defaultValue={profile?.portfolioUrl ?? ""}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otherLinks">Other links (optional)</Label>
                <Textarea
                  id="otherLinks"
                  name="otherLinks"
                  rows={2}
                  placeholder="One per line - blog, talks, projects..."
                  defaultValue={profile?.otherLinks?.join("\n") ?? ""}
                />
              </div>
            </div>

            <Button type="submit" className="w-fit">
              {isMentor ? "Save changes" : "Submit application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

