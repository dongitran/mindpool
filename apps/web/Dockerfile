# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Copy workspace manifests (cache layer)
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json         apps/web/

# --shamefully-hoist: hoist all devDeps (incl. vite) to /app/node_modules/
# so /app/node_modules/.bin/vite and /app/node_modules/vite/ both exist
RUN pnpm install --shamefully-hoist

COPY packages/shared/ packages/shared/
COPY apps/web/        apps/web/

WORKDIR /app/apps/web

# Call binaries from root node_modules/.bin directly — bypasses the broken
# per-package .bin/vite wrapper that references a non-existent pnpm stub dir
RUN /app/node_modules/.bin/tsc -b
RUN /app/node_modules/.bin/vite build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist         /usr/share/nginx/html
COPY --from=builder /app/apps/web/nginx.conf   /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
