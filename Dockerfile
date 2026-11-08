# ==========================================
# Stage 1: Build the TypeScript backend
# ==========================================
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Install native compilation dependencies (for argon2 / native addons)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package descriptors first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for tsc build)
RUN npm ci

# Copy application source code
COPY . .

# Compile TypeScript to dist/
RUN npm run build

# Remove development dependencies to keep the image lean
RUN npm prune --production

# ==========================================
# Stage 2: Production runtime image
# ==========================================
FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install basic CA certificates and curl for container healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Run as non-root user for security
USER node

# Copy production artifacts from builder
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/src/prisma ./src/prisma

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "dist/server.js"]
