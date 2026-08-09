import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@olgax/auth";
import { getMentorProfile, MENTORSHIP_SKILL_LEVELS, prisma } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitMentorshipRequest } from "./actions";

export default async function RequestMentorshipPage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Sign in to request mentorship</h1>
        <Link href={`/mentors/${mentorId}`} className="text-sm text-navy hover:underline dark:text-yellow">
          Back to profile
        </Link>
      </div>
    );
  }

  const [mentor, profile, existing] = await Promise.all([
    getMentorProfile(mentorId),
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    prisma.mentorship.findFirst({ where: { mentorId, studentId: session.user.id } }),
  ]);

  if (!mentor) notFound();

  if (existing && existing.status !== "DECLINED" && existing.status !== "CANCELLED") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Request already sent</h1>
        <p className="text-muted-foreground">
          {existing.status === "PENDING" && "Your request is still pending."}
          {existing.status === "ACTIVE" && `${mentor.name} is already mentoring you.`}
          {existing.status === "GRADUATED" && `You've already graduated with ${mentor.name}.`}
        </p>
        <Link
          href="/mentorship/dashboard"
          className="mt-4 inline-block text-sm text-navy hover:underline dark:text-yellow"
        >
          Go to your dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-16 sm:px-4">
      <Link href={`/mentors/${mentorId}`} className="mb-4 inline-block text-sm text-muted-foreground hover:underline">
        &larr; Back to profile
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <Avatar>
          <AvatarImage src={mentor.image ?? undefined} alt={mentor.name} />
          <AvatarFallback>{mentor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Request mentorship from {mentor.name}</h1>
          <p className="text-sm text-muted-foreground">A few details help them get up to speed quickly.</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-6">
          <form action={submitMentorshipRequest.bind(null, mentorId)} className="flex flex-col gap-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">About you</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Name</Label>
                  <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {session.user.name}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" name="age" type="number" min={0} defaultValue={profile?.age ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="university">University / institution</Label>
                  <Input id="university" name="university" defaultValue={profile?.university ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="linkedinUrl">LinkedIn (optional)</Label>
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    defaultValue={profile?.linkedinUrl ?? ""}
                  />
                </div>
                {profile?.githubUsername && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label>GitHub (linked)</Label>
                    <p className="text-sm text-muted-foreground">@{profile.githubUsername}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase">Your goals</h2>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goals">What are you hoping to learn or achieve?</Label>
                <Textarea id="goals" name="goals" required rows={3} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="skillLevel">Current skill level</Label>
                <select
                  id="skillLevel"
                  name="skillLevel"
                  required
                  className="w-fit rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select one</option>
                  {MENTORSHIP_SKILL_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="availability">Your availability</Label>
                <Input id="availability" name="availability" placeholder="e.g. Weekday evenings, IST" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="message">Anything else? (optional)</Label>
                <Textarea id="message" name="message" rows={2} />
              </div>
            </div>

            <Button type="submit" className="w-fit">
              Send request
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
