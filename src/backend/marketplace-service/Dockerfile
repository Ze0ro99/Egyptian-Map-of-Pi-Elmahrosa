# Stage 1: Builder
# node:18.17.1-alpine3.18 (v9.8.1 npm)
FROM node:18.17.1-alpine3.18 AS builder

# Add build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create app directory with appropriate permissions
WORKDIR /app
RUN chown -R node:node /app

# Switch to non-root user for build process
USER node

# Copy package files with version locking
COPY --chown=node:node package*.json ./

# Install dependencies with strict version control
RUN npm ci --only=production && \
    # Cache clean for optimization
    npm cache clean --force

# Copy source code with appropriate ownership
COPY --chown=node:node . .

# Build TypeScript code with production optimizations
RUN npm run build && \
    # Remove source maps in production
    rm -rf dist/**/*.js.map

# Stage 2: Production
FROM node:18.17.1-alpine3.18 AS production

# Add production dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory with restricted permissions
WORKDIR /app
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Copy built artifacts and dependencies from builder
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package*.json ./

# Set secure file permissions
RUN chmod -R 755 /app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3003 \
    LOG_LEVEL=info \
    API_TIMEOUT=30000 \
    MAX_PAYLOAD_SIZE=10mb

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Use tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Set resource limits
LABEL com.egyptian-map-pi.resource.memory="512M" \
      com.egyptian-map-pi.resource.cpu="0.5"

# Expose service port
EXPOSE 3003

# Start the service
CMD ["node", "dist/server.js"]