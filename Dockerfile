# syntax=docker/dockerfile:1.7

# ---------- builder ----------
FROM node:20-alpine AS builder

# Native module build deps (better-sqlite3, sharp prebuilds usually exist but
# keep the toolchain available so a fallback compile works on either arch).
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /build

# Manifests first for cache-friendly install
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY server/package.json server/
COPY client/package.json client/

RUN npm ci

# Sources
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY server ./server
COPY client ./client

# Build all workspaces
RUN npm run build

# Migrations are .sql — tsc doesn't copy them. Mirror into dist.
RUN mkdir -p server/dist/db/migrations \
 && cp server/src/db/migrations/*.sql server/dist/db/migrations/

# Drop dev deps
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM node:20-alpine AS runtime

# imagemagick: PSD/PSB previews. tini: PID 1 signal handling.
RUN apk add --no-cache imagemagick tini vips

WORKDIR /app

# Production dependency tree (workspace symlinks preserved by COPY)
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./
COPY --from=builder /build/package-lock.json ./

# Built workspaces
COPY --from=builder /build/packages/shared/package.json ./packages/shared/
COPY --from=builder /build/packages/shared/dist ./packages/shared/dist
COPY --from=builder /build/server/package.json ./server/
COPY --from=builder /build/server/dist ./server/dist
COPY --from=builder /build/client/dist ./client/dist

# Admin bootstrap script (runs inside the container via `docker compose exec`)
COPY scripts/create-admin.mjs ./scripts/create-admin.mjs

# Runtime config
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/app/server/data

# Drop privileges. The `node` user/group ship in the base image (uid/gid 1000).
RUN mkdir -p /app/server/data && chown -R node:node /app
USER node

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
