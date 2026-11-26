# =====================================
# STAGE 1: BUILD APPLICATION
# =====================================

FROM node:24-bookworm-slim AS builder

WORKDIR /app

ENV MONGOMS_DISABLE_POSTINSTALL=1

COPY package.json package-lock.json ./

RUN npm ci --include=dev

COPY tsconfig.json ./

COPY src ./src

RUN npm run build

# =====================================
# STAGE 2: PRODUCTION DEPENDENCIES
# =====================================

FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

# =====================================
# STAGE 3: PRODUCTION RUNTIME
# =====================================

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

ENV PORT=5000

# Runtime system dependencies.

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Production dependencies.

COPY --from=dependencies --chown=node:node \
    /app/node_modules ./node_modules

# Compiled application.

COPY --from=builder --chown=node:node \
    /app/dist ./dist

COPY --chown=node:node package.json ./

# Writable runtime directories.

RUN mkdir -p /app/uploads /app/tmp /app/cache \
    && chown -R node:node /app/uploads /app/tmp /app/cache

# Non-root execution.

USER node

EXPOSE 5000

# =====================================
# DEPENDENCY READINESS HEALTH CHECK
# =====================================

HEALTHCHECK --interval=30s --timeout=10s \
    --start-period=90s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/v1/ready', {signal: AbortSignal.timeout(5000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

STOPSIGNAL SIGTERM

CMD ["node", "dist/server.js"]