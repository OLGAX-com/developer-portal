import { prisma } from "../client";
import { addXp } from "./profile";

interface XpAward {
  userId: string;
  amount: number;
  reason: string;
  sourceType: string;
  sourceId: string;
}

/**
 * The single place XP is ever granted: records one ledger row (idempotent per
 * userId+sourceType+sourceId, so re-syncing the same GitHub activity never double-awards) and,
 * only if that row is new, applies it to the user's running total/level. Every point shown on a
 * profile or leaderboard traces back to a real, visible reason here.
 */
export async function awardXp(award: XpAward) {
  const result = await prisma.xpEntry.createMany({ data: [award], skipDuplicates: true });
  if (result.count === 0) return;
  await addXp(award.userId, award.amount);
}

/** Reverse-chronological XP log for a user - the "why did I get this XP" history. */
export function listXpEntriesForUser(userId: string, limit = 50) {
  return prisma.xpEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
