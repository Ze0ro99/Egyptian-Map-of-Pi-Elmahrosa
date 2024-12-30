# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build dependencies and dumb-init
RUN apk add --no-cache dumb-init=1.2.5-r2 \
    && apk add --no-cache --virtual .build-deps \
        python3 \
        make \
        g++ \
    && mkdir -p /app \
    && chown -R node:node /app

# Set working directory
WORKDIR /app

# Copy package files for layer caching
COPY --chown=node:node package*.json ./

# Switch to non-root user for build
USER node

# Install production dependencies with exact versions
RUN npm ci --only=production \
    && npm cache clean --force

# Copy source code and configs
COPY --chown=node:node . .

# Build TypeScript code
RUN npm run build \
    && npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Install dumb-init for proper process management
RUN apk add --no-cache dumb-init=1.2.5-r2

# Create non-root user and group
RUN addgroup -S authservice -g 10001 \
    && adduser -S -G authservice -u 10001 authservice

# Set working directory
WORKDIR /app

# Set secure directory permissions
RUN chown -R authservice:authservice /app \
    && chmod 755 /app

# Copy dumb-init and built artifacts from builder
COPY --from=builder /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=builder --chown=authservice:authservice /app/dist ./dist
COPY --from=builder --chown=authservice:authservice /app/node_modules ./node_modules
COPY --from=builder --chown=authservice:authservice /app/package.json ./package.json
COPY --from=builder --chown=authservice:authservice /app/healthcheck.js ./healthcheck.js

# Set secure file permissions
RUN find . -type d -exec chmod 755 {} \; \
    && find . -type f -exec chmod 644 {} \; \
    && chmod 755 /usr/bin/dumb-init \
    && chmod 755 healthcheck.js

# Configure environment
ENV NODE_ENV=production \
    PORT=3001 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    TZ=UTC

# Switch to non-root user
USER authservice

# Expose service port
EXPOSE 3001

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js

# Set memory limits and garbage collection
ENV NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=192"

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the service
CMD ["node", "dist/index.js"]

# Build-time metadata
LABEL maintainer="Egyptian Map of Pi Team" \
    org.opencontainers.image.title="Auth Service" \
    org.opencontainers.image.description="Authentication Service for Egyptian Map of Pi" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.vendor="Pi Network" \
    org.opencontainers.image.licenses="Proprietary" \
    org.opencontainers.image.created="${BUILD_DATE}" \
    org.opencontainers.image.source="https://github.com/pi-network/egyptian-map-of-pi" \
    security.capabilities.drop="ALL" \
    security.privileged="false" \
    security.readOnlyRootFilesystem="true"