import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import { getCertificate, getProgramProgress, type ProgramActivityItem } from "@olgax/database";

const TRACK_LABEL: Record<string, string> = {
  CONTRIBUTOR: "Contributor",
  DEVELOPER: "Developer",
  QA: "QA Engineer",
  ANALYST: "Product Analyst",
  MAINTAINER: "Maintainer",
};

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}\u2026` : text;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const certificate = await getCertificate(id);
  if (!certificate) return new Response("Not found", { status: 404 });

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

  const verifyUrl = new URL(`/certificates/${certificate.id}`, request.url).toString();
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  const qrPngBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const logoBytes = await readFile(
    path.join(process.cwd(), "public", "favicon_io-logo-light-bg", "android-chrome-192x192.png"),
  );

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const headingFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const qrImage = await pdfDoc.embedPng(qrPngBytes);
  const logoImage = await pdfDoc.embedPng(logoBytes);

  const navy = rgb(0.043, 0.114, 0.31);
  const yellow = rgb(0.961, 0.761, 0.102);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.85, 0.85, 0.85);

  // Outer decorative frame
  page.drawRectangle({ x: 20, y: 20, width: 802, height: 555, borderColor: navy, borderWidth: 2 });
  page.drawRectangle({ x: 0, y: 565, width: 842, height: 30, color: navy });
  page.drawRectangle({ x: 0, y: 0, width: 842, height: 15, color: yellow });

  page.drawImage(logoImage, { x: 40, y: 470, width: 48, height: 48 });
  page.drawText("OLGAX DEVELOPER PORTAL", { x: 100, y: 495, size: 12, font: headingFont, color: navy });
  page.drawText("Certificate of Achievement", { x: 100, y: 465, size: 26, font: headingFont, color: navy });

  page.drawText("This certifies that", { x: 40, y: 415, size: 11, font: bodyFont, color: gray });
  page.drawText(certificate.user.name, { x: 40, y: 390, size: 20, font: headingFont, color: rgb(0.15, 0.15, 0.15) });
  page.drawText("has successfully completed", { x: 40, y: 368, size: 11, font: bodyFont, color: gray });
  page.drawText(certificate.title, { x: 40, y: 342, size: 16, font: headingFont, color: navy });

  let detailY = 315;
  if (program) {
    const durationLabel = `${program.durationMonths} month${program.durationMonths === 1 ? "" : "s"} track`;
    page.drawText(`${TRACK_LABEL[program.track] ?? program.track} - ${durationLabel}`, {
      x: 40,
      y: detailY,
      size: 11,
      font: bodyFont,
      color: gray,
    });
    detailY -= 18;
  }
  if (progress && program && program.minXp > 0) {
    page.drawText(`${progress.totalXp} XP`, {
      x: 40,
      y: detailY,
      size: 11,
      font: bodyFont,
      color: gray,
    });
    detailY -= 18;
  }
  if (certificate.mentorName) {
    page.drawText(`Mentor: ${certificate.mentorName}`, { x: 40, y: detailY, size: 11, font: bodyFont, color: gray });
    detailY -= 18;
  }
  if (certificate.achievements.length > 0) {
    page.drawText(truncate(certificate.achievements.join("  |  "), 90), {
      x: 40,
      y: detailY,
      size: 10,
      font: bodyFont,
      color: gray,
    });
  }

  page.drawImage(qrImage, { x: 650, y: 340, width: 140, height: 140 });
  page.drawText("Scan to verify", { x: 680, y: 325, size: 9, font: bodyFont, color: gray });

  // Contribution detail: real projects/PRs/issues/reviews behind the achievement counts above.
  const columns: { heading: string; items: ProgramActivityItem[] }[] = [];
  if (progress && program) {
    if (program.minMergedPRs > 0) {
      columns.push({ heading: `MERGED PULL REQUESTS (${progress.mergedPRs.length})`, items: progress.mergedPRs });
    }
    if (program.minIssuesOpened > 0) {
      columns.push({ heading: `ISSUES OPENED (${progress.issuesOpened.length})`, items: progress.issuesOpened });
    }
    if (program.minReviews > 0) {
      columns.push({ heading: `CODE REVIEWS (${progress.reviews.length})`, items: progress.reviews });
    }
  }

  if (columns.length > 0) {
    page.drawLine({ start: { x: 40, y: 260 }, end: { x: 802, y: 260 }, thickness: 1, color: lightGray });
    page.drawText("CONTRIBUTION DETAIL", { x: 40, y: 240, size: 10, font: headingFont, color: navy });

    const columnWidth = 250;
    const columnXs = [40, 40 + columnWidth + 6, 40 + (columnWidth + 6) * 2];
    const maxItemsPerColumn = 10;

    columns.forEach((column, columnIndex) => {
      const x = columnXs[columnIndex];
      page.drawText(column.heading, { x, y: 218, size: 8, font: headingFont, color: gray });

      const visibleItems = column.items.slice(0, maxItemsPerColumn);
      visibleItems.forEach((item, index) => {
        const label = truncate(`${item.projectName} #${item.number} - ${item.title}`, 44);
        page.drawText(`- ${label}`, { x, y: 202 - index * 13, size: 8, font: bodyFont, color: gray });
      });
      if (column.items.length > maxItemsPerColumn) {
        page.drawText(`+ ${column.items.length - maxItemsPerColumn} more`, {
          x,
          y: 202 - visibleItems.length * 13,
          size: 8,
          font: bodyFont,
          color: gray,
        });
      }
    });
  }

  page.drawText(`Issued ${certificate.issueDate.toLocaleDateString()}`, { x: 40, y: 45, size: 10, font: bodyFont, color: gray });
  page.drawText(`Certificate ID: ${certificate.id}`, { x: 40, y: 32, size: 8, font: bodyFont, color: gray });

  const pdfBytes = await pdfDoc.save();

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${certificate.id}.pdf"`,
    },
  });
}
