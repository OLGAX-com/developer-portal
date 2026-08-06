import { prisma } from "../src/client";

/**
 * One-time (or repeatable) backfill for users who signed up before the
 * Profile-creation / GitHub-username-capture hooks existed in packages/auth.
 */
async function main() {
  const users = await prisma.user.findMany({ include: { profile: true, accounts: true } });

  for (const user of users) {
    if (!user.profile) {
      await prisma.profile.create({ data: { userId: user.id } });
      console.log(`Created profile for ${user.email}`);
    }

    if (user.profile?.githubUsername) continue;

    const githubAccount = user.accounts.find((account) => account.providerId === "github" && account.accessToken);
    if (!githubAccount?.accessToken) continue;

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubAccount.accessToken}`,
        "User-Agent": "olgax-community-platform",
      },
    });
    if (!response.ok) {
      console.warn(`Could not fetch GitHub profile for ${user.email}: ${response.status}`);
      continue;
    }

    const githubProfile = (await response.json()) as { login?: string };
    if (!githubProfile.login) continue;

    await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, githubUsername: githubProfile.login },
      update: { githubUsername: githubProfile.login },
    });
    console.log(`Linked ${user.email} to GitHub @${githubProfile.login}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
