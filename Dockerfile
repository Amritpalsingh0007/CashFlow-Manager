# ─── Brook — Dockerfile ───────────────────────────────────────────────────────
# Multi-stage build using Next.js standalone output.
# The final image is minimal: node:alpine + only the standalone bundle.
#
# Build:  docker build -t brook .
# Run:    docker run -p 3000:3000 \
#           -e JWT_SECRET=<secret> \
#           -e ADMIN_EMAIL=raj@brook.app \
#           -e ADMIN_PASSWORD=<password> \
#           -v /host/data:/data \
#           -e DB_PATH=/data/brook.db \
#           brook

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
# Approve native build scripts before installing
RUN npm install-scripts approve better-sqlite3 || true
RUN npm ci --omit=dev

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env — real secrets injected at runtime, not baked into image
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy JWT secret so the build can complete without real secrets
ENV JWT_SECRET=build-time-placeholder

RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# The SQLite DB lives in /data — mount a volume here in production
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs

EXPOSE 3000

# DB_PATH defaults to /data/brook.db when set via env at runtime
CMD ["node", "server.js"]
