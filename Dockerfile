# Base stage - Common dependencies
FROM node:24-alpine AS base
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package files
COPY --chown=nestjs:nodejs package*.json ./
COPY --chown=nestjs:nodejs prisma ./prisma/

# Install all dependencies
RUN npm ci && npm cache clean --force

# Development stage
FROM base AS development
# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY --chown=nestjs:nodejs . .

# Set user
USER nestjs

# Expose port
EXPOSE 3000

# Start development server with hot reload
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:dev"]

# Build stage for production
FROM base AS builder
# Switch back to root for building
USER root

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies and clean cache
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:24-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy built application and dependencies
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Generate Prisma client (to ensure it's available in production)
USER root
RUN npx prisma generate
USER nestjs

# Set user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
