import { Prisma, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

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
  const email = args.get("email");
  const role = (args.get("role") ?? "ADMINISTRATOR").toUpperCase();

  if (!email) {
    throw new Error(
      "Usage: pnpm --filter @olgax/database run promote -- --email=you@example.com [--role=ADMINISTRATOR]",
    );
  }
  if (!Object.values(Role).includes(role as Role)) {
    throw new Error(`Invalid role "${role}". Must be one of: ${Object.values(Role).join(", ")}`);
  }

  const user = await prisma.user
    .update({
      where: { email },
      data: { role: role as Role },
    })
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error(`No user found with email "${email}". Sign in once via GitHub first.`);
      }
      throw error;
    });

  console.log(`Promoted ${user.email} to ${user.role}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
