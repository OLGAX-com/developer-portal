import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronDown, Download, GitPullRequest, MessageSquare, Tag } from "lucide-react";
import QRCode from "qrcode";

import { getCertificate, getProgramProgress, type ProgramActivityItem } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TRACK_LABEL: Record<string, string> = {
  CONTRIBUTOR: "Contributor",
  DEVELOPER: "Developer",
  QA: "QA Engineer",
  ANALYST: "Product Analyst",
  MAINTAINER: "Maintainer",
};

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certificate = await getCertificate(id);

  if (!certificate) notFound();

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://developers.olgax.com"}/certificates/${certificate.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  const enrollment = certificate.programEnrollment;
  const program = enrollment?.program;
  const progress = enrollment
    ? await getProgramProgress(
        enrollment,
        enrollment.program,
        certificate.user.profile?.githubUsername ?? null,
        certificate.user.profile?.xp ?? 0,
      )
    : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <Card className="w-full overflow-hidden border-2 border-navy/20 dark:border-yellow/30">
        <div className="h-2 bg-navy dark:bg-yellow" />
        <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center sm:px-16">
          <Image
            src="/favicon_io-logo-light-bg/android-chrome-192x192.png"
            alt="Olgax Developer Portal"
            width={56}
            height={56}
            className="dark:hidden"
          />
          <Image
            src="/favicon_io-logo-dark-bg/android-chrome-192x192.png"
            alt="Olgax Developer Portal"
            width={56}
            height={56}
            className="hidden dark:block"
          />

          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Olgax Developer Portal
            </p>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-navy dark:text-yellow">
              <CheckCircle2 className="size-4" />
              <span className="text-sm font-medium">Verified Certificate</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">This certifies that</p>
            <p className="text-2xl font-semibold">{certificate.user.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">has successfully completed</p>
            <p className="mt-1 text-xl font-medium text-navy dark:text-yellow">{certificate.title}</p>
          </div>

          {program && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant="secondary">{TRACK_LABEL[program.track] ?? program.track}</Badge>
              <Badge variant="outline">
                {program.durationMonths} month{program.durationMonths === 1 ? "" : "s"} track
              </Badge>
            </div>
          )}

          <div className="grid w-full gap-6 border-t pt-6 text-left sm:grid-cols-[1.3fr_1fr]">
            <div className="flex flex-col gap-2">
              {progress ? (
                <>
                  {program!.minXp > 0 && (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-navy dark:text-yellow">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      {progress.totalXp} XP
                    </p>
                  )}
                  {program!.minMergedPRs > 0 && (
                    <AchievementDetails
                      label="Merged pull requests"
                      icon={GitPullRequest}
                      items={progress.mergedPRs}
                    />
                  )}
                  {program!.minIssuesOpened > 0 && (
                    <AchievementDetails label="Issues opened" icon={Tag} items={progress.issuesOpened} />
                  )}
                  {program!.minReviews > 0 && (
                    <AchievementDetails label="Code reviews" icon={MessageSquare} items={progress.reviews} />
                  )}
                </>
              ) : (
                certificate.achievements.length > 0 && (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {certificate.achievements.map((achievement) => (
                      <li key={achievement} className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckCircle2 className="size-3.5 shrink-0 text-navy dark:text-yellow" />
                        {achievement}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-xs text-muted-foreground">
                {enrollment && (
                  <>
                    <span className="text-right font-medium">Enrolled</span>
                    <span className="text-left">{enrollment.startedAt.toLocaleDateString()}</span>
                  </>
                )}
                <span className="text-right font-medium">Issued</span>
                <span className="text-left">{certificate.issueDate.toLocaleDateString()}</span>
                {certificate.mentorName && (
                  <>
                    <span className="text-right font-medium">Mentor</span>
                    <span className="text-left">{certificate.mentorName}</span>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-1 border-t pt-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL, not an optimizable static asset */}
                <img src={qrDataUrl} alt="Scan to verify this certificate" className="size-24" />
                <p className="text-xs text-muted-foreground">Scan or visit this page to verify</p>
                <p className="text-[11px] text-muted-foreground">Certificate ID: {certificate.id}</p>
              </div>

              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={`/api/certificates/${certificate.id}/pdf`}>
                    <Download className="size-4" />
                    Download PDF
                  </Link>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AchievementDetails({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: typeof GitPullRequest;
  items: ProgramActivityItem[];
}) {
  if (items.length === 0) return null;

  return (
    <details className="group rounded-lg border p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
        <span className="flex items-center gap-1.5">
          <Icon className="size-4 text-navy dark:text-yellow" />
          {label} ({items.length})
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5 border-t pt-2">
        {items.map((item) => (
          <li key={item.id} className="truncate text-xs">
            <Link href={item.url} className="hover:underline">
              {item.projectName} #{item.number} - {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

