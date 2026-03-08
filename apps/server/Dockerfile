# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Copy workspace manifests (cache layer — invalidates only when deps change)
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json         apps/server/

# Install all deps (dev + prod) — no lockfile required for local builds
RUN pnpm install

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/server/     apps/server/

# 1. Compile shared types → packages/shared/dist/
RUN pnpm --filter @mindpool/shared build

# 2. Compile server → apps/server/dist/
RUN pnpm --filter @mindpool/server build

# 3. Bundle production-only node_modules (respects workspace:* deps)
#    pnpm deploy copies apps/server/ files + resolves @mindpool/shared into
#    /deploy/node_modules/@mindpool/shared (using the files[] field in shared pkg)
RUN pnpm deploy --filter @mindpool/server --prod /deploy

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Production node_modules (includes @mindpool/shared with built dist/)
COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/package.json ./package.json

# Compiled server JS (copy explicitly — pnpm deploy may omit dist/ if gitignored)
COPY --from=builder /app/apps/server/dist ./dist

# wget for healthcheck
RUN apk add --no-cache wget

EXPOSE 3001
CMD ["node", "dist/index.js"]
