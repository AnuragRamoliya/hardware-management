# ==========================================
# Web Application Dockerfile (Multi-stage)
# ==========================================

# Stage 1: Build Web SPA
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy web source and build
COPY apps/web/ ./apps/web/
RUN npm run build --workspace=@hm/shared
RUN npm run build --workspace=@hm/web

# Stage 2: Production Nginx Server
FROM nginx:1.27-alpine AS runner

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Run as non-root user (nginx image supports non-root or unprivileged user)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
