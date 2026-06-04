# ─────────────────────────────────────────────────────────────────────────────
# Phlare — multi-stage image. Produces ONE image used for two roles:
#   * web  : `node server.js`            (Next.js standalone server)
#   * worker: `node_modules/.bin/tsx src/worker/index.ts`
# Playwright/Chromium is included for thesis-quality PDF report export.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- deps: install node modules (cached on lockfile) --------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# --- build: generate Prisma client + build Next.js ----------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runtime ------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
# OpenSSL is required by Prisma; chromium deps for Playwright PDF export.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Full node_modules are kept so the worker (tsx) and Prisma CLI run in-container.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY package.json tsconfig.json next.config.ts ./

EXPOSE 3000
CMD ["node", "server.js"]
