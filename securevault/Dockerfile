# ─── Stage 1: Build TypeScript ───
FROM --platform=linux/arm64 node:20-slim AS builder

WORKDIR /app

# Install build dependencies (native modules need python/build tools)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Prune devDependencies for production image
RUN npm prune --production

# ─── Stage 2: Production runtime ───
FROM --platform=linux/arm64 node:20-slim

WORKDIR /app

# Install runtime deps for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy production node_modules and built code
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create data directory for SQLite
RUN mkdir -p /app/data

# Non-root user for security
RUN groupadd -r vault && useradd -r -g vault -d /app -s /sbin/nologin vault
RUN chown -R vault:vault /app/data
USER vault

EXPOSE 8443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8443/health').then(r => { process.exit(r.ok ? 0 : 1) }).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]