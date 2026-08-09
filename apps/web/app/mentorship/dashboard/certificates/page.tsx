import { headers } from "next/headers";
import Link from "next/link";
import { Award } from "lucide-react";

import { auth } from "@olgax/auth";
import { listMentorshipsForUser } from "@olgax/database";

export default async function CertificatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const myMentorships = await listMentorshipsForUser(session.user.id);
  const hasGraduatedAsStudent = myMentorships.some(
    (mentorship) => mentorship.studentId === session.user.id && mentorship.status === "GRADUATED",
  );
  const hasGraduatedAsMentor = myMentorships.some(
    (mentorship) => mentorship.mentorId === session.user.id && mentorship.status === "GRADUATED",
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Certificates</h1>
      <p className="mb-6 text-muted-foreground">Earned through mentorship graduation.</p>

      {!hasGraduatedAsStudent && !hasGraduatedAsMentor ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet - graduating a mentorship (as student or mentor) issues a certificate automatically.
        </p>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          {hasGraduatedAsStudent && (
            <Link href="/profile#certificates" className="flex items-center gap-1.5 text-navy hover:underline dark:text-yellow">
              <Award className="size-4" /> View your graduation certificate
            </Link>
          )}
          {hasGraduatedAsMentor && (
            <Link href="/profile#certificates" className="flex items-center gap-1.5 text-navy hover:underline dark:text-yellow">
              <Award className="size-4" /> View your Certified Olgax Mentor certificate
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
