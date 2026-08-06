import { prisma } from "@olgax/database";
import { syncProject } from "../src/sync";

function parseArgs() {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const owner = args.get("owner");
  const repo = args.get("repo");
  const maintainerEmail = args.get("maintainer");

  if (!owner || !repo) {
    throw new Error(
      "Usage: pnpm --filter @olgax/github run add-project -- --owner=vercel --repo=next.js [--maintainer=email@example.com]",
    );
  }

  const project = await syncProject(owner, repo);
  console.log(`Tracking ${project.githubOwner}/${project.githubRepo} (synced at ${project.lastSyncedAt?.toISOString()})`);

  if (maintainerEmail) {
    const user = await prisma.user.findUnique({ where: { email: maintainerEmail } });
    if (!user) {
      console.warn(`No user found with email "${maintainerEmail}"; skipping maintainer link.`);
    } else {
      await prisma.projectMaintainer.upsert({
        where: { projectId_userId: { projectId: project.id, userId: user.id } },
        create: { projectId: project.id, userId: user.id },
        update: {},
      });
      console.log(`Linked ${maintainerEmail} as a maintainer of ${project.slug}`);
    }
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
