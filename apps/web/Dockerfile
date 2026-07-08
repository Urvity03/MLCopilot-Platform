# Stage 1: Builder
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm matching package.json version
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace configuration and lock files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

# Install dependencies (including devDependencies required for compilation)
RUN pnpm install --frozen-lockfile

# Copy codebase
COPY apps/web ./apps/web
COPY packages/contracts ./packages/contracts

# Build the project (generates standalone output inside apps/web/.next/standalone)
RUN pnpm --filter @mlcopilot/web build

# Stage 2: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy compiled standalone files and static bundles
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
