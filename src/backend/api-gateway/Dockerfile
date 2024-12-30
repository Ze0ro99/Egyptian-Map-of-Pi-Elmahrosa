# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies and tools
RUN apk add --no-cache python3 make g++ git curl

# Copy package files for dependency caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with strict version control and security audit
RUN npm ci --ignore-scripts \
    && npm audit fix \
    && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript code with optimizations
RUN npm run build \
    && npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set labels
LABEL maintainer="Egyptian Map of Pi Team" \
      service="api-gateway" \
      version="1.0.0" \
      environment="production" \
      region="me-south-1"

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Africa/Cairo \
    LANG=en_US.UTF-8 \
    NODE_OPTIONS="--max-old-space-size=2048"

# Install production dependencies
RUN apk add --no-cache tzdata curl \
    && cp /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs

# Set working directory and permissions
WORKDIR /app
RUN chown -R nodejs:nodejs /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Security hardening
RUN npm config set ignore-scripts true \
    && npm config set audit true \
    && npm config set fund false

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Set resource limits
ENV NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=16384"

# Expose API port
EXPOSE $PORT

# Start application with proper signal handling
CMD ["node", "--enable-source-maps", "dist/app.js"]