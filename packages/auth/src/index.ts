import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@olgax/database";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Let Postgres assign UUIDs instead of Better Auth's default id generator.
  advanced: {
    database: {
      generateId: false,
    },
  },
  socialProviders: {
    // Identity only (default scopes) - project-wide GitHub sync uses GITHUB_SYNC_TOKEN
    // (see packages/github), not a signed-in user's own OAuth token.
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    // Every user gets a Profile row (xp/level/badges/etc. all key off it).
    user: {
      create: {
        after: async (user) => {
          await prisma.profile.upsert({
            where: { userId: user.id },
            create: { userId: user.id },
            update: {},
          });
        },
      },
    },
    // Capture the real GitHub login so mission/leaderboard checks can match it
    // against synced GithubIssue/GithubReview activity.
    account: {
      create: {
        after: async (account) => {
          if (account.providerId !== "github" || !account.accessToken) return;

          try {
            const response = await fetch("https://api.github.com/user", {
              headers: {
                Authorization: `Bearer ${account.accessToken}`,
                "User-Agent": "olgax-community-platform",
              },
            });
            if (!response.ok) return;

            const githubProfile = (await response.json()) as { login?: string };
            if (!githubProfile.login) return;

            await prisma.profile.upsert({
              where: { userId: account.userId },
              create: { userId: account.userId, githubUsername: githubProfile.login },
              update: { githubUsername: githubProfile.login },
            });
          } catch {
            // Non-fatal: the contributor can still use the platform; this just retries next sign-in.
          }
        },
      },
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export { hasRole } from "./rbac";
