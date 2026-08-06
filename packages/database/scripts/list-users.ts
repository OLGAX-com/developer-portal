import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { email: true, name: true, role: true, createdAt: true },
  });

  if (users.length === 0) {
    console.log("No users yet. Sign in once via GitHub/Google, or run `pnpm run db:seed`.");
    return;
  }

  console.table(
    users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
