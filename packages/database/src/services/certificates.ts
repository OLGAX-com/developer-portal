import { prisma } from "../client";

export function issueCertificate(input: {
  userId: string;
  title: string;
  mentorName?: string;
  achievements?: string[];
}) {
  return prisma.certificate.create({
    data: {
      userId: input.userId,
      title: input.title,
      mentorName: input.mentorName,
      achievements: input.achievements ?? [],
    },
  });
}

export function getCertificate(id: string) {
  return prisma.certificate.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, image: true, profile: { select: { githubUsername: true, xp: true } } } },
      programEnrollment: { include: { program: true } },
    },
  });
}

export function listCertificatesForUser(userId: string) {
  return prisma.certificate.findMany({ where: { userId }, orderBy: { issueDate: "desc" } });
}
