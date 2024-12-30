# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM node:18-alpine AS builder

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    dumb-init@~1.2.5

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json yarn.lock lerna.json ./
COPY api-gateway/package.json ./api-gateway/
COPY auth-service/package.json ./auth-service/
COPY marketplace-service/package.json ./marketplace-service/
COPY payment-service/package.json ./payment-service/
COPY location-service/package.json ./location-service/
COPY messaging-service/package.json ./messaging-service/
COPY shared/package.json ./shared/

# Install dependencies with yarn workspaces
RUN yarn install --frozen-lockfile --network-timeout 600000

# Copy source code and configs
COPY . .

# Build TypeScript code
RUN yarn build

# Prune dev dependencies and clean up
RUN yarn install --production --ignore-scripts --prefer-offline \
    && yarn cache clean \
    && find . -name "*.map" -type f -delete \
    && find . -name "*.test.*" -type f -delete \
    && find . -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true

# -----------------------------
# Stage 2: Production
# -----------------------------
FROM node:18-alpine

# Install production essentials
RUN apk add --no-cache \
    dumb-init@~1.2.5 \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/yarn.lock ./

# Set secure permissions
RUN chmod 755 /app \
    && chown -R nodejs:nodejs /app

# Configure environment
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    TZ=Africa/Cairo

# Expose service ports
EXPOSE 3000 4001 4002 4003 4004 4005

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set security configurations
USER nodejs
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Set container metadata
LABEL maintainer="Egyptian Map of Pi Team" \
    version="1.0.0" \
    description="Egyptian Map of Pi Backend Services" \
    security.capabilities="drop-all" \
    org.opencontainers.image.source="https://github.com/egyptian-map-pi/backend"

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application with production optimizations
CMD ["node", "--enable-source-maps", "dist/api-gateway/src/main.js"]