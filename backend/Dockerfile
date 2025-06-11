# Smart Environmental Monitor - Backend Dockerfile
# Multi-stage build for production optimization

# Stage 1: Build dependencies
FROM node:18-alpine AS dependencies

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    udev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production image
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S iotuser -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies from build stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY --chown=iotuser:nodejs . .

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R iotuser:nodejs logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Switch to non-root user
USER iotuser

# Start application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]