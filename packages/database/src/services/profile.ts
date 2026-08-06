import { prisma } from "../client";
import { calculateLevel } from "./xp";

export interface ProfileEditableFields {
  bio?: string | null;
  university?: string | null;
  age?: number | null;
  location?: string | null;
  linkedinUrl?: string | null;
}

export function updateProfile(userId: string, data: ProfileEditableFields) {
  return prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

/** Adds XP to a user's profile and recalculates their level if it changed. */
export async function addXp(userId: string, amount: number) {
  if (amount === 0) return prisma.profile.findUniqueOrThrow({ where: { userId } });

  const profile = await prisma.profile.update({
    where: { userId },
    data: { xp: { increment: amount } },
  });

  const { level } = calculateLevel(profile.xp);
  if (level === profile.level) return profile;

  return prisma.profile.update({ where: { userId }, data: { level } });
}
