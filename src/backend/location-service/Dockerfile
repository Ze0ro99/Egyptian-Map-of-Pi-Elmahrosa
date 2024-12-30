# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ 

# Set working directory
WORKDIR /app

# Copy package files with strict version control
COPY package*.json ./

# Install dependencies with npm ci for reproducible builds
RUN npm ci --no-audit

# Copy source code and TypeScript config
COPY . .

# Build TypeScript code with optimizations
RUN npm run build \
    && npm prune --production \
    && npm cache clean --force

# Run security audit
RUN npm audit

# Stage 2: Production
FROM node:18-alpine

# Install dumb-init for proper process management
RUN apk add --no-cache dumb-init=1.2.5-r2

# Set working directory
WORKDIR /app

# Copy built artifacts and dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/healthcheck.js ./

# Set secure permissions
RUN chown -R node:node /app \
    && chmod -R 755 /app

# Create non-root user
USER node

# Set environment variables
ENV NODE_ENV=production \
    PORT=3002 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    TZ="Africa/Cairo"

# Set security limits
RUN ulimit -n 65535

# Configure health check
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=40s \
            --retries=3 \
            CMD ["node", "healthcheck.js"] || exit 1

# Expose service port
EXPOSE 3002

# Set startup command with dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Build-time metadata
LABEL maintainer="Egyptian Map of Pi Team" \
      version="1.0.0" \
      description="Location Service for Egyptian Map of Pi" \
      org.opencontainers.image.source="https://github.com/egyptian-map-of-pi/location-service" \
      org.opencontainers.image.vendor="Pi Network" \
      org.opencontainers.image.title="Location Service" \
      org.opencontainers.image.description="Handles geospatial operations, geocoding, and location-based features" \
      org.opencontainers.image.created="2023" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.licenses="Proprietary"

# Security configurations
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser