import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import { getCertificate } from "@olgax/database";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const certificate = await getCertificate(id);
  if (!certificate) return new Response("Not found", { status: 404 });

  const verifyUrl = new URL(`/certificates/${certificate.id}`, request.url).toString();
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  const qrPngBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const headingFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const qrImage = await pdfDoc.embedPng(qrPngBytes);

  const navy = rgb(0.043, 0.114, 0.31);
  const yellow = rgb(0.961, 0.761, 0.102);
  const gray = rgb(0.4, 0.4, 0.4);

  page.drawRectangle({ x: 0, y: 565, width: 842, height: 30, color: navy });
  page.drawRectangle({ x: 0, y: 0, width: 842, height: 15, color: yellow });

  page.drawText("OLGAX", { x: 40, y: 500, size: 16, font: headingFont, color: navy });
  page.drawText("Certificate of Achievement", { x: 40, y: 460, size: 26, font: headingFont, color: navy });
  page.drawText(certificate.title, { x: 40, y: 420, size: 16, font: bodyFont, color: rgb(0.15, 0.15, 0.15) });
  page.drawText(`Awarded to ${certificate.user.name}`, { x: 40, y: 385, size: 14, font: bodyFont, color: gray });
  page.drawText(`Issued ${certificate.issueDate.toLocaleDateString()}`, { x: 40, y: 360, size: 11, font: bodyFont, color: gray });
  if (certificate.mentorName) {
    page.drawText(`Mentor: ${certificate.mentorName}`, { x: 40, y: 340, size: 11, font: bodyFont, color: gray });
  }
  certificate.achievements.forEach((achievement, index) => {
    page.drawText(`- ${achievement}`, { x: 40, y: 300 - index * 18, size: 11, font: bodyFont, color: gray });
  });
  page.drawText(`Certificate ID: ${certificate.id}`, { x: 40, y: 40, size: 8, font: bodyFont, color: gray });

  page.drawImage(qrImage, { x: 650, y: 340, width: 140, height: 140 });
  page.drawText("Scan to verify", { x: 680, y: 325, size: 9, font: bodyFont, color: gray });

  const pdfBytes = await pdfDoc.save();

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${certificate.id}.pdf"`,
    },
  });
}
