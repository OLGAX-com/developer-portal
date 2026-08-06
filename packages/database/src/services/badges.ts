import { prisma } from "../client";
import { createNotification } from "./notifications";

export async function awardBadge(userId: string, badgeSlug: string) {
  const badge = await prisma.badge.findUniqueOrThrow({ where: { slug: badgeSlug } });

  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return existing;

  const awarded = await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });

  await createNotification({
    userId,
    type: "BADGE_AWARDED",
    title: `Badge earned: ${badge.name}`,
    body: badge.description,
  });

  return awarded;
}

export function listBadgesForUser(userId: string) {
  return prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { awardedAt: "desc" },
  });
}

export function listAllBadges() {
  return prisma.badge.findMany({ orderBy: { name: "asc" } });
}
