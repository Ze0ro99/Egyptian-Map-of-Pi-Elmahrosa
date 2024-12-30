# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies including dev dependencies for build
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install production dependencies
RUN apk add --no-cache tini curl

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Set environment variables
ENV NODE_ENV=production \
    PORT=3004 \
    SOCKET_PATH=/socket.io \
    NODE_OPTIONS="--max-old-space-size=2048" \
    LOG_LEVEL=info \
    npm_config_unsafe_perm=false

# Copy production dependencies and built code
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package.json ./

# Create healthcheck script
RUN echo '#!/usr/bin/env node\n\
const http = require("http");\n\
const options = {\n\
  host: "localhost",\n\
  port: process.env.PORT || 3004,\n\
  path: "/health",\n\
  timeout: 2000\n\
};\n\
const request = http.request(options, (res) => {\n\
  process.exit(res.statusCode === 200 ? 0 : 1);\n\
});\n\
request.on("error", function(err) {\n\
  process.exit(1);\n\
});\n\
request.end();' > healthcheck.js && \
chmod +x healthcheck.js

# Set secure permissions
RUN chown -R nodejs:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER nodejs

# Expose service port
EXPOSE 3004

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the service
CMD ["node", "dist/cluster.js"]