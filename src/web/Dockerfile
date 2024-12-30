# Stage 1: Builder
FROM node:18-alpine AS builder

# Security: Add non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

# Set working directory
WORKDIR /app

# Set environment variables for build optimization
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OPTIMIZE_FONTS=true \
    NEXT_OPTIMIZE_IMAGES=true

# Copy package files with security verification
COPY --chown=appuser:appgroup package*.json ./
COPY --chown=appuser:appgroup yarn.lock ./

# Install dependencies with security flags
RUN yarn install --frozen-lockfile --production=false --network-timeout 100000 && \
    yarn cache clean

# Copy source code with proper permissions
COPY --chown=appuser:appgroup . .

# Build application with optimizations
RUN yarn build && \
    # Remove development dependencies
    yarn install --production --ignore-scripts --prefer-offline && \
    # Remove unnecessary files
    rm -rf src .next/cache

# Stage 2: Production
FROM nginx:alpine

# Security: Add non-root user for nginx
RUN addgroup -g 1001 nginxgroup && \
    adduser -u 1001 -G nginxgroup -s /bin/sh -D nginxuser

# Install required packages for security and compression
RUN apk add --no-cache curl tzdata

# Configure nginx with security headers and optimizations
COPY --chown=nginxuser:nginxgroup nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginxuser:nginxgroup security-headers.conf /etc/nginx/security-headers.conf

# Copy built application from builder stage
COPY --from=builder --chown=nginxuser:nginxgroup /app/.next/static /usr/share/nginx/html/_next/static
COPY --from=builder --chown=nginxuser:nginxgroup /app/public /usr/share/nginx/html
COPY --from=builder --chown=nginxuser:nginxgroup /app/.next/server/pages /usr/share/nginx/html

# Set strict permissions
RUN chmod -R 555 /usr/share/nginx/html && \
    chown -R nginxuser:nginxgroup /var/cache/nginx && \
    chown -R nginxuser:nginxgroup /var/log/nginx && \
    chown -R nginxuser:nginxgroup /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginxuser:nginxgroup /var/run/nginx.pid

# Configure compression and caching
RUN rm /etc/nginx/conf.d/default.conf
COPY --chown=nginxuser:nginxgroup compression.conf /etc/nginx/conf.d/compression.conf
COPY --chown=nginxuser:nginxgroup cache-control.conf /etc/nginx/conf.d/cache-control.conf

# Set environment variables for runtime
ENV TZ=Africa/Cairo \
    NGINX_WORKER_PROCESSES=auto \
    NGINX_WORKER_CONNECTIONS=1024

# Expose ports
EXPOSE 80 443

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Set container metadata
LABEL maintainer="Egyptian Map of Pi Team" \
      version="1.0.0" \
      description="Egyptian Map of Pi Web Frontend" \
      security.scan-date="{{.Date}}"

# Switch to non-root user
USER nginxuser

# Start nginx with reduced privileges
CMD ["nginx", "-g", "daemon off;"]

# Configure volumes for persistence
VOLUME ["/var/cache/nginx", "/var/log/nginx", "/etc/nginx/ssl"]

# Set working directory for runtime
WORKDIR /usr/share/nginx/html

# Optimize for production
ARG BUILD_DATE
ARG VCS_REF
LABEL org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.schema-version="1.0"