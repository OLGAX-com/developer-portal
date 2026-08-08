# Build from the monorepo root: docker build -f apps/docs/Dockerfile .
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/docs/package.json apps/docs/package.json
RUN pnpm install --frozen-lockfile --filter docs...

FROM base AS builder
WORKDIR /repo
RUN corepack enable
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/docs/node_modules ./apps/docs/node_modules
COPY apps/docs apps/docs
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm --filter docs run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/docs/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/docs/.next/static ./apps/docs/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/docs/server.js"]
