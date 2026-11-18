# ==========================================
# API Application Dockerfile (Multi-stage)
# ==========================================

# Stage 1: Build API & Shared Packages
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy API source and build
COPY apps/api/ ./apps/api/
RUN npm run build --workspace=@hm/shared
RUN npm run build --workspace=@hm/api

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Security: create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package manifests and production dependencies
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/package*.json ./apps/api/
COPY apps/api/.sequelizerc ./apps/api/

RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/Database ./apps/api/Database

# Fix ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8000/api-docs/ || exit 1

WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
