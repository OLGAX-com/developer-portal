import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";

import { getCertificate } from "@olgax/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certificate = await getCertificate(id);

  if (!certificate) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 sm:px-6">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="mb-2 size-10 text-navy dark:text-yellow" />
          <CardTitle className="text-xl">Verified Certificate</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium">{certificate.title}</p>
          <p className="text-muted-foreground">Awarded to {certificate.user.name}</p>
          <p className="text-sm text-muted-foreground">
            Issued {certificate.issueDate.toLocaleDateString()}
            {certificate.mentorName && ` · Mentor: ${certificate.mentorName}`}
          </p>
          {certificate.achievements.length > 0 && (
            <ul className="mt-2 flex flex-wrap justify-center gap-2 text-sm">
              {certificate.achievements.map((achievement) => (
                <li key={achievement} className="rounded-full bg-muted px-3 py-1">
                  {achievement}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Certificate ID: {certificate.id}</p>
          <Link
            href={`/api/certificates/${certificate.id}/pdf`}
            className="mt-2 flex items-center gap-1.5 text-sm text-navy hover:underline dark:text-yellow"
          >
            <Download className="size-4" />
            Download PDF
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
