import { prisma } from "../client";

export function markOnboardingStepComplete(userId: string, key: string) {
  return prisma.onboardingStep.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key },
    update: {},
  });
}

export function listOnboardingSteps(userId: string) {
  return prisma.onboardingStep.findMany({ where: { userId } });
}
