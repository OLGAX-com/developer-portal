import { prisma } from "@olgax/database";
import { syncProject } from "../src/sync";

/** Re-syncs every tracked project. Intended to be run on a schedule (cron / GitHub Actions). */
async function main() {
  const projects = await prisma.project.findMany({ select: { githubOwner: true, githubRepo: true } });

  if (projects.length === 0) {
    console.log("No tracked projects yet. Run `pnpm --filter @olgax/github run add-project` first.");
    return;
  }

  for (const { githubOwner, githubRepo } of projects) {
    console.log(`Syncing ${githubOwner}/${githubRepo}...`);
    await syncProject(githubOwner, githubRepo).catch((error) => {
      console.error(`Failed to sync ${githubOwner}/${githubRepo}:`, error instanceof Error ? error.message : error);
    });
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
