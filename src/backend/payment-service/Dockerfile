# Stage 1: Builder
FROM node:18-alpine AS builder

# Set environment variables
ENV NODE_ENV=production

# Install build essentials and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files with strict permissions
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig.json ./

# Install dependencies with security audit
RUN npm ci --only=production && \
    npm audit fix && \
    npm cache clean --force

# Copy source code and config files
COPY --chown=node:node . .

# Verify source integrity and build TypeScript code
RUN npm run build && \
    npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production \
    PORT=3005 \
    LOG_LEVEL=info

# Install security updates and essential packages
RUN apk update && \
    apk add --no-cache \
    dumb-init \
    tini \
    && rm -rf /var/cache/apk/*

# Create and set working directory with proper permissions
WORKDIR /app
RUN chown -R node:node /app

# Copy built artifacts and dependencies from builder
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package*.json ./

# Set strict file permissions
RUN chmod -R 755 /app && \
    chmod -R 644 /app/dist/* && \
    chmod -R 644 /app/package*.json

# Configure non-root user
USER node

# Set security policies
RUN npm config set ignore-scripts true && \
    npm config set unsafe-perm false

# Expose service port
EXPOSE 3005

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

# Set startup command with init system
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]

# Add metadata labels
LABEL maintainer="Egyptian Map of Pi Team" \
      version="1.0.0" \
      description="Payment Service for Egyptian Map of Pi" \
      org.opencontainers.image.source="https://github.com/egyptian-map-of-pi/payment-service" \
      org.opencontainers.image.vendor="Egyptian Map of Pi" \
      org.opencontainers.image.title="Payment Service" \
      org.opencontainers.image.description="Secure Pi cryptocurrency payment processing service" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.created="2023-10-19" \
      security.capabilities="no-new-privileges=true"

# Apply security options
STOPSIGNAL SIGTERM