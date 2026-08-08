# Build from the monorepo root: docker build -f apps/web/Dockerfile .
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/database/prisma packages/database/prisma
COPY packages/auth/package.json packages/auth/package.json
COPY packages/github/package.json packages/github/package.json
RUN pnpm install --frozen-lockfile --filter web...

FROM base AS builder
WORKDIR /repo
RUN corepack enable
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages ./packages
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter @olgax/database exec prisma generate
RUN pnpm --filter web run build

# A "toolbox" image for running one-off ops commands against the production DB
# (migrate:deploy, db:seed, promote). The `runner` image below is a stripped
# standalone build with no Prisma CLI or scripts in it, so deploy this instead
# as a second, separate service with build target "ops" - it just idles, so
# `docker exec` into it (or your platform's equivalent shell/exec feature) and
# run e.g.:
#   pnpm --filter @olgax/database run migrate:deploy
#   pnpm --filter @olgax/database run db:seed
#   pnpm --filter @olgax/database run promote -- --email=you@example.com
FROM builder AS ops
WORKDIR /repo
CMD ["tail", "-f", "/dev/null"]

# IMPORTANT: keep `runner` as the LAST stage in this file. Without an explicit
# --target flag, `docker build` builds whichever stage is last - so anything
# deploying the real app (not the ops toolbox) must either build/select this
# stage by name, or this needs to stay last as the safe default.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /repo/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]

